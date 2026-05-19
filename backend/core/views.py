from multiprocessing.sharedctypes import Value
from warnings import filters
import json
import os
import logging
import csv
import io
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import urlopen

from django.conf import settings
from django.http import HttpResponse
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError

logger = logging.getLogger(__name__)
from django.forms import IntegerField
from rest_framework import generics, permissions, status
from django.shortcuts import get_object_or_404
from .models import *
from .serializers import *
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .permissions import IsCompanyUser, CanUpdateBookingStatus, IsAccountAdmin
from .plan_limits import PLAN_CONFIG
from rest_framework.exceptions import ValidationError, PermissionDenied
from datetime import time, timedelta, datetime
from core.models import Booking, Service
from rest_framework import generics, permissions
from accounts.models import User
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from django.db.models import Case, When, Value, IntegerField
from django.utils import timezone
from django.db.models.deletion import ProtectedError

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from core.location_verification import extract_document_text, verify_location_document
from core.storage_policy import enforce_company_storage_limit


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        # 1. Validation
        if not old_password or not new_password:
            return Response(
                {"error": "Both old and new passwords are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Security Check
        if not user.check_password(old_password):
            return Response(
                {"error": "Old password incorrect"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Hash and Save
        user.set_password(new_password)
        user.save()
        
        return Response({"message": "Password updated successfully"}, status=status.HTTP_200_OK)

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenSerializer


class GoogleAuthConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        client_id = (getattr(settings, 'GOOGLE_CLIENT_ID', '') or '').strip()
        return Response(
            {
                "client_id": client_id,
                "enabled": bool(client_id),
            },
            status=status.HTTP_200_OK,
        )


class CompanyLocationVerificationView(APIView):
    permission_classes = [IsAuthenticated, IsAccountAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        company = request.user.company
        requested_country_code = (request.data.get("country_code") or "").upper().strip()
        uploaded_document = request.FILES.get("verification_document")
        device_latitude = request.data.get("device_latitude")
        device_longitude = request.data.get("device_longitude")

        if not requested_country_code or len(requested_country_code) != 2:
            return Response({"error": "A valid 2-letter country code is required."}, status=400)
        if not uploaded_document:
            return Response({"error": "A verification document is required."}, status=400)

        allowed_suffixes = {".pdf", ".txt", ".csv", ".doc", ".docx"}
        extension = Path(uploaded_document.name or "").suffix.lower()
        if extension not in allowed_suffixes:
            return Response({"error": "Unsupported file type. Upload PDF or text-based files."}, status=400)
        max_size_bytes = 10 * 1024 * 1024
        if uploaded_document.size > max_size_bytes:
            return Response({"error": "Document too large. Maximum allowed size is 10MB."}, status=400)

        try:
            replacing = [company.location_verification_document] if company.location_verification_document else []
            enforce_company_storage_limit(
                company,
                incoming_bytes=int(uploaded_document.size or 0),
                replacing_file_fields=replacing,
            )
        except ValidationError as exc:
            return Response(exc.detail, status=400)

        # --- DOCUMENT-FIRST ENFORCEMENT (with always-included geo/ip checks) ---
        extracted_text, extraction_error = extract_document_text(uploaded_document)
        match_result = verify_location_document(
            company_name=company.name,
            document_text=extracted_text,
            requested_country_code=requested_country_code,
            business_address=company.address or "",
        )
        # Always run geo/ip checks for all country changes
        geo_match = False
        geo_country = None
        device_check = {
            "verified": False,
            "reason": "Device geolocation was not provided.",
            "detected_country_code": None,
            "source": "device_geo",
        }
        if device_latitude and device_longitude:
            try:
                from geopy.geocoders import Nominatim
                geolocator = Nominatim(user_agent="dtailbase_location_verification")
                location = geolocator.reverse(f"{device_latitude}, {device_longitude}", language="en", zoom=5, exactly_one=True)
                geo_country = ((location.raw or {}).get("address", {}) or {}).get("country_code", "").upper()
                geo_match = geo_country == requested_country_code
                device_check = {
                    "verified": geo_match,
                    "reason": (
                        f"Device geolocation matched selected country ({requested_country_code})."
                        if geo_match
                        else f"Device geolocation suggests {geo_country or 'unknown'}, which does not match selected country ({requested_country_code})."
                    ),
                    "detected_country_code": geo_country or None,
                    "source": "device_geo",
                }
            except Exception:
                device_check = {
                    "verified": False,
                    "reason": "Device geolocation could not be resolved.",
                    "detected_country_code": None,
                    "source": "device_geo",
                }

        ip_match = False
        ip_country = None
        vpn_detected = False
        ip_check = {
            "verified": False,
            "reason": "IP geolocation check was not performed.",
            "detected_country_code": None,
            "vpn_detected": False,
            "source": "ip_geo",
        }
        if not geo_match:
            from payments.geolocation import detect_pricing_context
            pricing_context = detect_pricing_context(request)
            ip_country = (pricing_context.get("country_code") or "US").upper()
            vpn_detected = bool(pricing_context.get("vpn_detected", False))
            ip_match = ip_country == requested_country_code and not vpn_detected
            if vpn_detected:
                ip_reason = "IP security checks indicate VPN/proxy usage."
            elif ip_match:
                ip_reason = f"IP geolocation matched selected country ({requested_country_code})."
            else:
                ip_reason = f"IP geolocation suggests {ip_country}, which does not match selected country ({requested_country_code})."
            ip_check = {
                "verified": ip_match,
                "reason": ip_reason,
                "detected_country_code": ip_country,
                "vpn_detected": vpn_detected,
                "source": "ip_geo",
            }
        else:
            ip_country = geo_country
            ip_check = {
                "verified": True,
                "reason": "IP geolocation check passed via trusted device geolocation.",
                "detected_country_code": ip_country or None,
                "vpn_detected": False,
                "source": "ip_geo",
            }

        # Compose checklist for frontend
        checks = dict(match_result.get("checks", {}))
        checks["device_location"] = device_check
        checks["ip_location"] = ip_check

        # --- Require all document and geo checks to PASS for any country change ---
        doc_checks = match_result.get("checks", {})
        doc_company_verified = doc_checks.get("company", {}).get("verified", False)
        doc_country_verified = doc_checks.get("country", {}).get("verified", False)
        doc_address_verified = doc_checks.get("address", {}).get("verified", False)

        device_geo_verified = checks.get("device_location", {}).get("verified", False)
        ip_geo_verified = checks.get("ip_location", {}).get("verified", False)

        # Approval logic
        all_doc_pass = doc_company_verified and doc_country_verified and doc_address_verified
        all_geo_pass = device_geo_verified and ip_geo_verified
        approved = all_doc_pass and all_geo_pass

        # Score: count all checks
        passing_checks = [
            doc_checks.get("company", {}),
            doc_checks.get("country", {}),
            doc_checks.get("address", {}),
            checks.get("device_location", {}),
            checks.get("ip_location", {}),
        ]
        score = sum([c.get("score", 0.0) for c in passing_checks if c.get("verified")])
        score = round(score / max(1, len(passing_checks)), 4)

        requested_currency = "USD"
        company.requested_country_code = requested_country_code
        company.requested_currency = requested_currency
        company.location_verification_document = uploaded_document
        company.location_verification_score = score
        company.location_verification_notes = match_result["reason"]
        if approved:
            company.country_code = requested_country_code
            company.currency = requested_currency
            company.location_verification_status = "APPROVED"
            company.location_verified_at = timezone.now()
            company.save(update_fields=[
                "requested_country_code",
                "requested_currency",
                "location_verification_document",
                "location_verification_score",
                "location_verification_notes",
                "location_verification_status",
                "location_verified_at",
                "country_code",
                "currency",
            ])
            return Response(
                {
                    "verified": True,
                    "status": "APPROVED",
                    "score": company.location_verification_score,
                    "message": company.location_verification_notes,
                    "country_code": company.country_code,
                    "currency": company.currency,
                    "checks": checks,
                },
                status=200,
            )
        else:
            company.location_verification_status = "REJECTED"
            company.location_verified_at = None
            company.save(update_fields=[
                "requested_country_code",
                "requested_currency",
                "location_verification_document",
                "location_verification_score",
                "location_verification_status",
                "location_verified_at",
                "location_verification_notes",
            ])
            fail_reason = "All document and geo checks (company, country, address, device, IP) must PASS."
            return Response(
                {
                    "verified": False,
                    "status": "REJECTED",
                    "score": company.location_verification_score,
                    "message": fail_reason + " " + (match_result["reason"] or ""),
                    "checks": checks,
                },
                status=400,
            )


class CompanyAccountLifecycleView(APIView):
    permission_classes = [IsAuthenticated, IsAccountAdmin]

    def post(self, request):
        company = request.user.company
        action = (request.data.get("action") or "").lower().strip()

        if action == "deactivate":
            company.is_active = False
            company.save(update_fields=["is_active"])
            User.objects.filter(company=company).update(is_active=False)
            return Response({"message": "Account deactivated. All team members have been disabled."}, status=200)

        if action == "delete":
            confirmation_name = (request.data.get("confirmation_name") or "").strip()
            if confirmation_name.lower() != (company.name or "").strip().lower():
                return Response({"error": "Confirmation name does not match company name."}, status=400)

            company.delete()
            return Response({"message": "Company account deleted permanently."}, status=200)

        return Response({"error": "Unsupported action. Use 'deactivate' or 'delete'."}, status=400)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    @staticmethod
    def _to_bool(value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
        return bool(value)

    def post(self, request):
        credential = request.data.get("credential")
        if not credential:
            return Response(
                {"detail": "Google credential is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        google_payload = self._verify_google_credential(credential)
        if isinstance(google_payload, Response):
            return google_payload

        email = google_payload.get("email")
        if not email:
            return Response(
                {"detail": "Google account did not include an email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).select_related("company").first()

        if not user:
            return Response(
                {"detail": "No account exists for this Google email. Please register first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account is inactive. Contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)

        mobile_app = self._to_bool(request.data.get("mobile_app", False))
        remember_me = self._to_bool(request.data.get("remember_me", True))
        if mobile_app and remember_me:
            refresh.set_exp(lifetime=timedelta(days=45))

        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": MyTokenSerializer.build_user_payload(user),
            },
            status=status.HTTP_200_OK,
        )

    def _verify_google_credential(self, credential):
        token_info_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={quote(credential)}"

        try:
            with urlopen(token_info_url, timeout=6) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, ValueError):
            return Response(
                {"detail": "Invalid Google credential."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        issuer = payload.get("iss")
        if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
            return Response(
                {"detail": "Google credential issuer is invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(payload.get("email_verified", "")).lower() != "true":
            return Response(
                {"detail": "Google email is not verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expected_client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
        if expected_client_id and payload.get("aud") != expected_client_id:
            return Response(
                {"detail": "Google credential audience does not match this app."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return payload

class UserCreateAPIView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]  # Anyone can register


class CustomerVehicleListAPIView(generics.ListAPIView):
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]

        customer = get_object_or_404(
            Customer,
            id=customer_id,
            company=self.request.user.company
        )

        return Vehicle.objects.filter(customer=customer)


class BookingListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCompanyUser]

    def perform_create(self, serializer):
        company = self.request.user.company
        
        # 🛡️ Tier Enforcement Logic
        if company.plan == 'STARTER':
            booking_count = company.get_monthly_booking_count()
            if booking_count >= 10:
                raise PermissionDenied(
                    "Starter plan limit reached (10 bookings/mo). Please upgrade to Professional for unlimited bookings."
                )
        
        serializer.save(company=company)

    def get_serializer_class(self):
        if self.request.method == "GET":
            # This is the "Read" serializer we created in the previous step
            return BookingListSerializer 
        return BookingCreateSerializer

    def get_queryset(self):
        return Booking.objects.filter(company=self.request.user.company)

    def get_serializer_context(self):
        return {"request": self.request}
    

class AvailabilityAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, date=None, service=None):
        """
        If service UUID is given, returns slots for that service.
        If no service is given, returns slots for all services for the date.
        """
        # Parse date
        if not date:
            return Response({"error": "Date is required"}, status=400)
        try:
            booking_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        company = request.user.company
        dynamic_buffer = getattr(company, 'booking_buffer', 15)
        
        # 🛡️ Dynamic Business Hours
        opening_time_val = getattr(company, 'opening_time', time(9, 0))
        closing_time_val = getattr(company, 'closing_time', time(17, 0))

        opening_time = datetime.combine(booking_date, opening_time_val)
        closing_time = datetime.combine(booking_date, closing_time_val)

        # Get all active services for the company
        if service:
            services_qs = Service.objects.filter(id=service, company=request.user.company, is_active=True)
            if not services_qs.exists():
                return Response({"error": "Service not found"}, status=404)
        else:
            services_qs = Service.objects.filter(company=request.user.company, is_active=True)

        # Collect all bookings for the day and sort by start time
        bookings = Booking.objects.filter(
            booking_date=booking_date,
            company=company
        ).order_by("booking_time")

        # Build a list of unavailable time blocks
        # Build unavailable blocks with buffer
        unavailable_blocks = []
        for b in bookings:
            # We subtract the buffer from the start and add it to the end
            start = datetime.combine(booking_date, b.booking_time) - timedelta(minutes=dynamic_buffer)
            end = datetime.combine(booking_date, b.booking_end_time) + timedelta(minutes=dynamic_buffer)
            unavailable_blocks.append((start, end))


        result = []
        for svc in services_qs:
            slots = []
            current_time = opening_time
            now = datetime.now()  # Get current time

            while current_time + timedelta(minutes=svc.duration_minutes) <= closing_time:
                end_time = current_time + timedelta(minutes=svc.duration_minutes)

                # If the booking date is today, and the slot start time is in the past, skip it.
                if booking_date == now.date() and current_time < now:
                    # Increment by 15 or 30 mins to keep looking for a future slot today
                    current_time += timedelta(minutes=15) 
                    continue
                
                overlap = False
                for block_start, block_end in unavailable_blocks:
                    if not (end_time <= block_start or current_time >= block_end):
                        overlap = True
                        current_time = block_end 
                        break

                if not overlap:
                    slots.append({
                        "start": current_time.time().strftime("%H:%M"),
                        "end": end_time.time().strftime("%H:%M")
                    })
                    # Use the dynamic buffer to find the next possible start time
                    current_time = end_time + timedelta(minutes=dynamic_buffer)

            result.append({
                "service": {
                    "id": svc.id,
                    "name": svc.name,
                    "description": svc.description,
                    "duration_minutes": svc.duration_minutes,
                    "base_price": str(svc.base_price)
                },
                "available_slots": slots
            })

        response_data = {"date": booking_date}
        if service:
            response_data["service"] = result[0]
        else:
            response_data["services"] = result

        return Response(response_data)


    


class BookingRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyUser]

    def get_serializer_class(self):
        # Use the heavy serializer for viewing details (GET), 
        # but the standard one for updates (PUT/PATCH)
        if self.request.method == "GET":
            return BookingDetailSerializer
        return BookingSerializer

    def get_queryset(self):
        return Booking.objects.filter(company=self.request.user.company).select_related(
            'customer', 
            'vehicle', 
            'service', 
            'booking_indemnity'
        ).prefetch_related(
            'booking_indemnity__condition_photos'
        )

    def get_serializer_context(self):
        return {"request": self.request}
    
    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        
        if booking.status in ["IN_PROGRESS", "COMPLETED"]:
            return Response(
                {"error": f"Cannot delete a booking that is already {booking.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return super().destroy(request, *args, **kwargs)


# List & Create Services
class ServiceListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        include_inactive = str(self.request.query_params.get("include_inactive", "")).lower() in {"1", "true", "yes"}

        if self.request.user.is_superuser:
            queryset = Service.objects.all()
        else:
            queryset = Service.objects.filter(company=self.request.user.company)

        if include_inactive:
            return queryset

        return queryset.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)



# Retrieve, Update, Delete a Service
class ServiceRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Service.objects.all()
        return Service.objects.filter(company=self.request.user.company)

    def destroy(self, request, *args, **kwargs):
        service = self.get_object()

        # Check if service has bookings
        has_bookings = Booking.objects.filter(service=service).exists()

        if has_bookings:
            if service.is_active:
                service.is_active = False
                service.save(update_fields=["is_active"])
            return Response(
                {
                    "message": "This service has existing bookings and cannot be deleted. It has been deactivated instead.",
                    "is_active": False,
                    "deactivated": True,
                },
                status=status.HTTP_200_OK
            )

        return super().destroy(request, *args, **kwargs)
    
class CustomerDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "customer_id"

    def get_queryset(self):
        # Only customers belonging to the logged-in company
        return Customer.objects.filter(company=self.request.user.company)

    def destroy(self, request, *args, **kwargs):
        customer = self.get_object()

        reasons = []
        if customer.bookings.exists():
            reasons.append("existing bookings")
        if customer.customer_indemnity_agreements.exists():
            reasons.append("signed indemnity records")

        if reasons:
            return Response(
                {
                    "error": f"Cannot delete this customer because it has {', '.join(reasons)}. Remove or archive dependent records first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "error": "Cannot delete this customer because related records still reference it."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class CustomerCsvTemplateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="customers_template.csv"'

        writer = csv.writer(response)
        writer.writerow(["firstname", "lastname", "email", "phone"])
        writer.writerow(["Alex", "Meyer", "alex@example.com", "+27110000000"])
        writer.writerow(["Jamie", "Stone", "jamie@example.com", "+27110000001"])

        return response


class CustomerCsvImportAPIView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        company = request.user.company
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG["STARTER"])
        if company.plan not in {"PRO", "ENTERPRISE"}:
            return Response(
                {"error": "CSV customer upload is available on Pro and Enterprise plans only."},
                status=status.HTTP_403_FORBIDDEN,
            )

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"error": "Please attach a CSV file in the 'file' field."}, status=400)

        filename = (uploaded_file.name or "").lower()
        if not filename.endswith(".csv"):
            return Response({"error": "Only .csv files are supported."}, status=400)

        try:
            decoded = uploaded_file.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            return Response({"error": "CSV must be UTF-8 encoded."}, status=400)

        reader = csv.DictReader(io.StringIO(decoded))
        if not reader.fieldnames:
            return Response({"error": "CSV header row is missing."}, status=400)

        normalized_header_map = {field.strip().lower(): field for field in reader.fieldnames if field}
        required_columns = ["firstname", "lastname", "email", "phone"]
        missing_columns = [column for column in required_columns if column not in normalized_header_map]
        if missing_columns:
            return Response(
                {"error": f"Missing required column(s): {', '.join(missing_columns)}."},
                status=400,
            )

        max_customers = plan_limits.get("max_customers", 1000)
        current_count = Customer.objects.filter(company=company).count()
        has_limit = max_customers is not None
        remaining_slots = None if not has_limit else max(0, max_customers - current_count)

        existing_emails = {
            (email or "").strip().lower()
            for email in Customer.objects.filter(company=company).values_list("email", flat=True)
        }
        batch_emails = set()

        created_count = 0
        duplicate_count = 0
        skipped_due_limit = 0
        total_rows = 0
        failed_rows = []

        for line_number, row in enumerate(reader, start=2):
            if not row or not any((value or "").strip() for value in row.values()):
                continue

            total_rows += 1
            first_name = (row.get(normalized_header_map["firstname"]) or "").strip()
            last_name = (row.get(normalized_header_map["lastname"]) or "").strip()
            email = (row.get(normalized_header_map["email"]) or "").strip()
            phone = (row.get(normalized_header_map["phone"]) or "").strip()
            row_snapshot = {
                "firstname": first_name,
                "lastname": last_name,
                "email": email,
                "phone": phone,
            }

            if not first_name or not last_name or not email or not phone:
                failed_rows.append({
                    "line": line_number,
                    "reason": "Missing required value(s).",
                    **row_snapshot,
                })
                continue

            try:
                validate_email(email)
            except DjangoValidationError:
                failed_rows.append({
                    "line": line_number,
                    "reason": "Invalid email format.",
                    **row_snapshot,
                })
                continue

            email_key = email.lower()
            if email_key in existing_emails or email_key in batch_emails:
                duplicate_count += 1
                continue

            if has_limit and remaining_slots is not None and remaining_slots <= 0:
                skipped_due_limit += 1
                continue

            Customer.objects.create(
                company=company,
                firstname=first_name,
                lastname=last_name,
                email=email,
                phone=phone,
            )

            created_count += 1
            batch_emails.add(email_key)
            if has_limit and remaining_slots is not None:
                remaining_slots -= 1

        return Response(
            {
                "message": "CSV import processed.",
                "created": created_count,
                "duplicates": duplicate_count,
                "skipped_due_limit": skipped_due_limit,
                "failed_rows": failed_rows[:20],
                "failed_row_count": len(failed_rows),
                "total_rows": total_rows,
            },
            status=200,
        )

class CustomerListAPIView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "customer_id"

    def get_queryset(self):
        # Only customers belonging to the logged-in company
        return Customer.objects.filter(company=self.request.user.company)
    
    def perform_create(self, serializer):
        # Auto-assign customer to company
        serializer.save(company=self.request.user.company)

class VehicleListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = VehicleCreateSerializer  # for POST
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return VehicleSerializer  # Nested customer for list
        return VehicleCreateSerializer

    def get_serializer_context(self):
        return {"request": self.request}

    def get_queryset(self):
        return Vehicle.objects.filter(
            customer__company=self.request.user.company
        )
    
class VehicleRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VehicleCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Vehicle.objects.filter(
            customer__company=self.request.user.company
        )

    def get_serializer_context(self):
        return {"request": self.request}

    def destroy(self, request, *args, **kwargs):
        vehicle = self.get_object()

        if vehicle.bookings.exists():
            return Response(
                {
                    "error": "Cannot delete this vehicle because it is linked to existing bookings."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "error": "Cannot delete this vehicle because related records still reference it."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )



# core/views.py

# core/views.py

class BookingStatusUpdateView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingStatusSerializer
    permission_classes = [permissions.IsAuthenticated, CanUpdateBookingStatus]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_context(self):
        return {"request": self.request}
    
    def update(self, request, *args, **kwargs):
        # Get old status before update
        booking = self.get_object()
        old_status = booking.status
        
        # Perform the update
        response = super().update(request, *args, **kwargs)
        
        # Check if status changed and send notifications
        booking.refresh_from_db()
        new_status = booking.status
        
        if old_status != new_status:
            # Send status change notifications
            self._send_status_update_notifications(booking, old_status, new_status)
        
        return response
    
    def _send_status_update_notifications(self, booking, old_status, new_status):
        """Send email/app notifications when booking status changes"""
        from .signals import send_booking_status_update_email
        from .notifications import broadcast_booking_status_update
        
        # Send email notification
        send_booking_status_update_email(booking, old_status, new_status)
        
        # Broadcast live notification via WebSocket
        broadcast_booking_status_update(booking)

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

    def get_permissions(self):
        """
        Only Owners can update company details.
        Staff and Owners can view (retrieve/my_company).
        """
        if self.action in ['update', 'partial_update']:
            # Use your custom OWNER check
            permission_classes = [IsAuthenticated, IsAccountAdmin]
        elif self.action in ['create', 'destroy']:
            # Only system-wide Superusers should be creating/deleting entire Companies
            permission_classes = [permissions.IsSuperUser] 
        else:
            # List, Retrieve, and my_company
            permission_classes = [IsAuthenticated]
            
        return [p() for p in permission_classes]
    
    def get_queryset(self):
        """
        CRITICAL: This acts as the primary gatekeeper.
        It limits the "universe" of objects the user can even try to touch.
        """
        user = self.request.user
        if not user.is_authenticated:
            return Company.objects.none()
            
        if user.is_superuser:
            return Company.objects.all()
            
        # Users only see their own company. 
        # Even if they try to PATCH /api/company/WRONG-ID/, 
        # Django will return 404 because it's not in this queryset.
        return Company.objects.filter(id=user.company.id)
    
    @action(detail=False, methods=['get'], url_path='my_company')
    def get_my_company(self, request):
        """
        Returns the company details for the logged-in user.
        Accessed via: GET /api/company/my_company/
        """
        company = request.user.company
        if not company:
            return Response({"detail": "User has no company assigned."}, status=404)

        # Normalize legacy records: billing is USD-only for all countries.
        fields_to_update = []
        if (company.currency or "").upper() != "USD":
            company.currency = "USD"
            fields_to_update.append("currency")
        if company.requested_currency and (company.requested_currency or "").upper() != "USD":
            company.requested_currency = "USD"
            fields_to_update.append("requested_currency")
        if fields_to_update:
            company.save(update_fields=fields_to_update)
        
        serializer = self.get_serializer(company)
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        # Save the company (this updates the plan)
        instance = serializer.save()
        
        # 🛡️ Run the Seat Enforcement
        self.enforce_plan_limits(instance)

    def enforce_plan_limits(self, company):
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        max_users = plan_limits.get('max_users', 1)
        
        requestor = self.request.user

        # Prioritize: Current User (0) > Owners (1) > Staff (2) > Newest first
        all_users = User.objects.filter(company=company).annotate(
            role_priority=Case(
                When(id=requestor.id, then=Value(0)),
                When(role='OWNER', then=Value(1)),
                When(role='STAFF', then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            )
        ).order_by('role_priority', '-created_at')
        
        users_list = list(all_users)
        
        for index, user in enumerate(users_list):
            new_status = (index < max_users)
            
            # Only save if the status is actually changing to save database hits
            if user.is_active != new_status:
                user.is_active = new_status
                user.save() # Full save to ensure Admin reflects changes
                print(f"User {user.email} active status changed to: {new_status}")

        

    def perform_create(self, serializer):
        serializer.save()  # extra logic can be added if needed

class CompanyCreateAPIView(generics.CreateAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAdminUser]

# views.py

class CompanyTeamListView(generics.ListCreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAccountAdmin]


    # make sure they can only access users from their own company
    # and if downgraded, they can only see the first user (Owner) and not the additional staff member
    # only return the logged in user if they are an owner, otherwise return the first user (owner) for staff members on the plan
    def get_queryset(self):
        user = self.request.user
        company = user.company

        # 1. Get the IDs of the users we want to include
        # Always include the current user
        # Plus other active members of the company
        user_ids = User.objects.filter(
            company=company, 
        ).values_list('id', flat=True)
        
        # Ensure current user ID is in the list even if they were somehow deactivated
        id_list = list(user_ids)
        if user.id not in id_list:
            id_list.append(user.id)

        # all users belonging to the company should be returned,
        # but the queryset will be limited by the plan's max_users and the ordering logic in the get_queryset method of the viewset
        # 2. Re-query using the IDs, then apply annotation and ordering to the WHOLE set
        return User.objects.filter(id__in=id_list).annotate(
            role_priority=Case(
                When(role='OWNER', then=Value(1)),
                When(role='STAFF', then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            )
        ).order_by('role_priority', '-created_at')

    def perform_create(self, serializer):
        company = self.request.user.company
        plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        max_users = plan_limits.get('max_users', 1)
        
        # 🛡️ Creation Gatekeeper
        team_count = User.objects.filter(company=company).count()
        
        if team_count >= max_users:
            raise ValidationError({
                "plan_limit": f"Your {company.plan} plan is limited to {max_users} users. Please upgrade to Pro to add more team members."
            })

        new_user = serializer.save(company=company)
        
        # 📋 AUDIT LOG: Team member added
        logger.info(
            f"AUDIT: Team member added - Company: {company.id}, "
            f"Added by: {self.request.user.email}, "
            f"New user: {new_user.email}, Role: {new_user.role}"
        )

class CompanyUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAccountAdmin]

    plan_limits = PLAN_CONFIG.get('STARTER')  # Default to STARTER if something goes wrong

    def get_queryset(self):
        company = self.request.user.company
        return User.objects.filter(company=company)
    
    def perform_destroy(self, instance):
        # Prevent self-deletion
        if instance == self.request.user:
            raise ValidationError("You cannot delete your own account from the team management page.")
        
        # Check if trying to delete the last owner
        if instance.role == 'OWNER':
            other_owners = User.objects.filter(
                company=instance.company, 
                role='OWNER', 
                is_active=True
            ).exclude(id=instance.id).count()
            
            if other_owners == 0:
                raise ValidationError("You cannot delete the last active Owner of this company. Please assign ownership to another user first.")
        
        try:
            # 📋 AUDIT LOG: Team member removed
            logger.info(
                f"AUDIT: Team member removed - Company: {instance.company.id}, "
                f"Removed by: {self.request.user.email}, "
                f"Removed user: {instance.email}, Role: {instance.role}"
            )
            
            instance.delete()
        except Exception as e:
            logger.error(f"Error deleting user {instance.email}: {str(e)}", exc_info=True)
            raise ValidationError(f"Failed to delete user: {str(e)}")
        
    

class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company = user.company
        
        # Get limits dynamically
        plan_data = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
        
        data = UserSerializer(user).data
        data['company'] = {
            "id": company.id,
            "plan": company.plan,
            "current_monthly_usage": {
                "monthly_bookings": company.get_monthly_booking_count()
            },
            # Use the config file here!
            "usage_limits": plan_data.get('monthly_bookings'), 
            "user_limit": plan_data.get('max_users'),
            "buffer_timer": getattr(company, 'booking_buffer', 15),
        }
        return Response(data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    

#-------------------------------------------------PUBLIC VIEWS-------------------------------------------------
# Public View for Company Info (Logo, Name, Hours)
class CompanyPublicDetailView(generics.RetrieveAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanyPublicSerializer
    permission_classes = [permissions.AllowAny] # No login needed
    lookup_field = 'slug'

# Public View for Services belonging to that company
class ServicePublicListView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        slug = self.request.query_params.get('slug')
        return Service.objects.filter(company__slug=slug)

class PublicAvailabilityView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Service.objects.all()
    lookup_url_kwarg = 'service_id'

    def retrieve(self, request, *args, **kwargs):
        service = self.get_object()
        company = service.company # Get availability rules from the owner company
        date_str = self.kwargs.get('date')
        
        try:
            booking_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format"}, status=400)

        # 1. Setup Business Hours from Company
        dynamic_buffer = getattr(company, 'booking_buffer', 15)
        opening_time_val = getattr(company, 'opening_time', time(9, 0))
        closing_time_val = getattr(company, 'closing_time', time(17, 0))

        opening_time = datetime.combine(booking_date, opening_time_val)
        closing_time = datetime.combine(booking_date, closing_time_val)

        # 2. Build Unavailable Blocks (Just like your Admin view)
        bookings = Booking.objects.filter(
            booking_date=booking_date,
            company=company
        ).exclude(status='CANCELLED').order_by("booking_time")

        unavailable_blocks = []
        for b in bookings:
            # Buffer subtracted from start and added to end
            start = datetime.combine(booking_date, b.booking_time) - timedelta(minutes=dynamic_buffer)
            end = datetime.combine(booking_date, b.booking_end_time) + timedelta(minutes=dynamic_buffer)
            unavailable_blocks.append((start, end))

        # 3. Generate Slots
        slots = []
        current_time = opening_time
        duration = timedelta(minutes=service.duration_minutes)

        now = datetime.now()  # Get current time

        while current_time + duration <= closing_time:
            end_time = current_time + duration

            if booking_date == now.date() and current_time < now:
                # Increment by 15 or 30 mins to keep looking for a future slot today
                current_time += timedelta(minutes=15) 
                continue
            
            overlap = False
            for block_start, block_end in unavailable_blocks:
                if not (end_time <= block_start or current_time >= block_end):
                    overlap = True
                    current_time = block_end # Skip ahead to the end of the blockage
                    break

            if not overlap:
                slots.append({
                    "start": current_time.time().strftime("%H:%M"),
                    "end": end_time.time().strftime("%H:%M")
                })
                # Increment by the buffer (Your "Step Interval")
                current_time = end_time + timedelta(minutes=dynamic_buffer)
            
            # If we hit an overlap, the loop already incremented 'current_time' to 'block_end'
            # If no overlap, we already moved current_time forward. 
            # To prevent infinite loops if something goes wrong:
            if not overlap and duration.total_seconds() == 0:
                break

        return Response({
            "service": {
                "id": service.id,
                "name": service.name,
                "available_slots": slots
            }
        })

class PublicBookingCreateView(generics.CreateAPIView):
    queryset = Booking.objects.all()
    serializer_class = PublicBookingSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        slug = self.kwargs.get('company_slug')
        company = get_object_or_404(Company, slug=slug)
        
        if not company.can_create_booking():
            raise ValidationError({"plan_limit": "Usage limit reached."})
            
        # This passes 'company' into the serializer's validated_data
        serializer.save(company=company)
    
    def create(self, request, *args, **kwargs):
        """Override to return confirmation details instead of minimal response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Get the created booking directly from the serializer instance
        booking = serializer.instance
        confirmation_serializer = PublicBookingConfirmationSerializer(booking)
        
        return Response(confirmation_serializer.data, status=status.HTTP_201_CREATED)


class PublicCustomerBookingsView(generics.ListAPIView):
    """Allow customers to view their bookings by company slug and email"""
    serializer_class = PublicBookingConfirmationSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        slug = self.kwargs.get('company_slug')
        email = self.request.query_params.get('email')
        
        if not email:
            return Booking.objects.none()
        
        company = get_object_or_404(Company, slug=slug)
        
        # Find bookings by customer email
        return Booking.objects.filter(
            company=company,
            customer__email=email
        ).order_by('-created_at')
