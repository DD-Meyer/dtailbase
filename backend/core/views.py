from multiprocessing.sharedctypes import Value
from warnings import filters

from django.forms import IntegerField
from rest_framework import generics, permissions, status
from django.shortcuts import get_object_or_404
from .models import *
from .serializers import *
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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

from rest_framework_simplejwt.views import TokenObtainPairView


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
        if self.request.user.is_superuser:
            return Service.objects.filter(is_active=True)
        return Service.objects.filter(
            company=self.request.user.company,
            is_active=True
        )

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
            return Response(
                {
                    "error": "This service has existing bookings and cannot be deleted. It has been deactivated instead."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Soft delete logic
        service.is_active = False
        service.save()

        return Response(
            {"message": "Service deactivated successfully"},
            status=status.HTTP_200_OK  # Changed from 204 to 200 so message is visible
        )
    
class CustomerDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "customer_id"

    def get_queryset(self):
        # Only customers belonging to the logged-in company
        return Customer.objects.filter(company=self.request.user.company)

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
        # This correctly catches the 'pk' from the URL and passes it to the serializer
        return super().update(request, *args, **kwargs)

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
        plan_limit = PLAN_CONFIG.get(company.plan, {}).get('max_users', 1)

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
        ).order_by('role_priority', '-created_at')[:plan_limit]

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

        serializer.save(company=company)

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
        instance.delete()

        # cannot deactivate the last owner
        if instance.role == 'OWNER' and not User.objects.filter(company=instance.company, role='OWNER', is_active=True).exists():
            raise ValidationError("You cannot delete the last active Owner of this company.")
        
    

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
