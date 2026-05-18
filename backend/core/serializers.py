from warnings import filters

from rest_framework import serializers
from .models import *
from django.contrib import admin
from datetime import datetime, timedelta
from django.db import transaction
from accounts.models import User, Company
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from indemnity.models import *
from drf_extra_fields.fields import Base64ImageField
# core/serializers.py
from indemnity.serializers import IndemnityAgreementSerializer, VehiclePhotoSerializer
# core/serializers.py
from indemnity.utils import generate_agreement_pdf
from core.plan_limits import PLAN_CONFIG
from core.image_processing import resize_image_to_plan_limit
from core.storage_policy import enforce_company_storage_limit



# accounts/serializers.py
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
# --- CUSTOMER SERIALIZERS ---

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "firstname", "lastname", "email", "phone"]
        read_only_fields = ["id"]

class CustomerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "company", "firstname", "lastname", "email", "phone"]
    
    def validate(self, data):
        request = self.context.get("request")
        if request and hasattr(request.user, 'company'):
            company = request.user.company
            plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
            
            # 🛡️ CUSTOMER GATEKEEPER
            max_customers = plan_limits.get('max_customers', 1000)
            # Handle float('inf') for comparison
            if max_customers is not None: 
                current_count = Customer.objects.filter(company=company).count()
                if current_count >= max_customers:
                    raise serializers.ValidationError({
                        "plan_limit": f"Your {company.plan} plan is limited to {max_customers} customers. Please upgrade."
                    })
        return data

    def create(self, validated_data):
        validated_data["company"] = self.context["request"].user.company
        return super().create(validated_data)

# --- VEHICLE SERIALIZERS ---

class VehicleSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)

    class Meta:
        model = Vehicle
        fields = ["id", "make", "model", "year", "registration", "customer"]

class VehicleCreateSerializer(serializers.ModelSerializer):
    # This tells DRF to expect a Customer ID from the frontend
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())

    class Meta:
        model = Vehicle
        fields = ["id", "make", "model", "year", "registration", "customer"]

    def to_representation(self, instance):
        # This tells DRF: "After saving, use the detailed Serializer to send data back to React"
        return VehicleSerializer(instance).data

    def validate(self, data):
        customer = data.get("customer")
        registration = data.get("registration")

        # Check if this specific customer already has this registration
        if Vehicle.objects.filter(customer=customer, registration=registration).exists():
            raise serializers.ValidationError(
                {"registration": "This vehicle is already registered to this customer."}
            )
        return data

    def create(self, validated_data):
        # Simply create the vehicle linked to the provided customer ID
        return Vehicle.objects.create(**validated_data)


        # --- INDEMNITY & PHOTO SERIALIZERS (Keep these above Booking) ---



# --- DETAILED BOOKING SERIALIZER ---

class BookingDetailSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)

    service_name = serializers.ReadOnlyField(source='service.name')
    total_price = serializers.ReadOnlyField(source='service.base_price')
    indemnity_data = IndemnityAgreementSerializer(source='booking_indemnity', read_only=True)
    admin_signature = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "company", "status", "booking_date", "booking_time", "booking_end_time",
            "started_at", "completed_at", "notes", "admin_signature", "is_authorized",
            "customer", "vehicle", "service_name", "total_price", 
            "indemnity_data"
        ]
    
    def get_admin_signature(self, obj):
        if not obj.admin_signature:
            return None
            
        # If it's already a full data URI (from a signature pad), return it
        if isinstance(obj.admin_signature, str) and obj.admin_signature.startswith('data:'):
            return obj.admin_signature
            
        # Otherwise, return the standard URL so your React 'getFullImageUrl' can handle it
        return obj.admin_signature.url

# --- BOOKING HELPERS ---

def calculate_end_time(booking_date, booking_time, service):
    start_dt = datetime.combine(booking_date, booking_time)
    return (start_dt + timedelta(minutes=service.duration_minutes)).time()

# --- BOOKING SERIALIZERS ---

# --- BOOKING SERIALIZERS ---

class BookingSerializer(serializers.ModelSerializer):
    is_signed = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = [
            "company", "created_at", "booking_end_time", 
            "started_at", "completed_at", "cancelled_at"
        ]

    def validate(self, data):
        request = self.context["request"]
        company = request.user.company
        
        # 1. Fetch dynamic buffer from the company (default to 15 if not set)
        dynamic_buffer = getattr(company, 'booking_buffer', 15)
        
        instance = getattr(self, "instance", None)
        customer = data.get("customer", instance.customer if instance else None)
        vehicle = data.get("vehicle", instance.vehicle if instance else None)
        service = data.get("service", instance.service if instance else None)
        booking_date = data.get("booking_date", instance.booking_date if instance else None)
        booking_time = data.get("booking_time", instance.booking_time if instance else None)

        if vehicle and customer and vehicle.customer != customer:
            raise serializers.ValidationError({"vehicle": "Vehicle does not belong to this customer"})
        
        if booking_date and booking_time and service:
            start_dt = datetime.combine(booking_date, booking_time)
            end_dt = start_dt + timedelta(minutes=service.duration_minutes)

            # 2. Conflict Check against other bookings
            existing_bookings = Booking.objects.filter(booking_date=booking_date, company=company)
            if instance:
                existing_bookings = existing_bookings.exclude(id=instance.id)

            for b in existing_bookings:
                e_start = datetime.combine(b.booking_date, b.booking_time)
                # Apply the dynamic buffer here
                e_end = datetime.combine(b.booking_date, b.booking_end_time) + timedelta(minutes=dynamic_buffer)
                
                if start_dt < e_end and end_dt > e_start:
                    raise serializers.ValidationError(
                        {"booking_time": f"Time slot unavailable. Business requires a {dynamic_buffer}-minute gap between jobs."}
                    )

            data["booking_end_time"] = end_dt.time()

        requested_status = data.get("status")
        if instance and requested_status and requested_status.upper() == "IN_PROGRESS" and instance.status != "IN_PROGRESS":
            agreement = getattr(instance, 'booking_indemnity', None)
            if not agreement or not agreement.signature_image:
                raise serializers.ValidationError({
                    "status": "Cannot start booking: client signature is required."
                })

            before_photos_count = agreement.condition_photos.filter(photo_type='BEFORE').count()
            if before_photos_count < 1:
                raise serializers.ValidationError({
                    "status": "Cannot start booking: upload at least one BEFORE image first."
                })
            
        return data

    def create(self, validated_data):
        with transaction.atomic():
            validated_data["company"] = self.context["request"].user.company
            return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # 1. Capture new values or use existing ones
        service = validated_data.get('service', instance.service)
        b_date = validated_data.get('booking_date', instance.booking_date)
        b_time = validated_data.get('booking_time', instance.booking_time)

        # 2. If time or service changed, manually update the read-only end_time
        if 'booking_time' in validated_data or 'service' in validated_data:
            instance.booking_end_time = calculate_end_time(b_date, b_time, service)

        # 3. Handle Status change if it's part of this request
        new_status = validated_data.get('status')
        if new_status and new_status != instance.status:
            instance.change_status(new_status)

        return super().update(instance, validated_data)

    def get_is_signed(self, obj):
        return hasattr(obj, 'booking_indemnity')
    

class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            "customer", "vehicle", "service", "booking_date",
            "booking_time", "notes", "admin_signature", "is_authorized"
        ]

    def validate(self, data):
        request = self.context.get("request")
        plan_limits = PLAN_CONFIG.get(request.user.company.plan, PLAN_CONFIG['STARTER']) if request and hasattr(request.user, 'company') else PLAN_CONFIG['STARTER']
        if request and hasattr(request.user, 'company'):
            company = request.user.company
            
            # 🛡️ THE GATEKEEPER
            if company.plan == 'STARTER' and company.get_monthly_booking_count() >= plan_limits.get('monthly_booking_limit', 10):
                raise serializers.ValidationError({
                    "plan_limit": f"You have reached your limit of {plan_limits.get('monthly_booking_limit', 10)} bookings for the Starter plan. Please upgrade to Pro."
                })
        return data

    def create(self, validated_data):
        service = validated_data["service"]
        validated_data["booking_end_time"] = calculate_end_time(
            validated_data["booking_date"], validated_data["booking_time"], service
        )
        validated_data["company"] = self.context["request"].user.company
        return super().create(validated_data)

class BookingListSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.firstname')
    customer_lastname = serializers.ReadOnlyField(source='customer.lastname')
    vehicle_details = serializers.SerializerMethodField()
    service_name = serializers.ReadOnlyField(source='service.name')
    total_price = serializers.ReadOnlyField(source='service.base_price')
    is_signed = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "customer", "customer_name", "customer_lastname", 
            "vehicle", "vehicle_details", "service_name", 
            "booking_date", "booking_time", "booking_end_time",
            "status", "total_price", "notes", "started_at",
            "completed_at", "is_signed", "admin_signature", "is_authorized", "created_at" # Added signatures here
        ]

    def get_vehicle_details(self, obj):
        return {
            "make": obj.vehicle.make,
            "model": obj.vehicle.model,
            "registration": obj.vehicle.registration,
            "year": obj.vehicle.year
        }

    def get_is_signed(self, obj):
        return hasattr(obj, 'booking_indemnity')

# --- OTHER SERIALIZERS ---

class ServiceSerializer(serializers.ModelSerializer):
    service_indemnity_template = serializers.PrimaryKeyRelatedField(
        queryset=IndemnityTemplate.objects.none(),
        required=False,
        allow_null=True,
    )
    service_indemnity_template_title = serializers.CharField(
        source="service_indemnity_template.title",
        read_only=True,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and getattr(request.user, "company", None):
            self.fields["service_indemnity_template"].queryset = IndemnityTemplate.objects.filter(
                company=request.user.company
            ).order_by("-version")

    def validate(self, attrs):
        request = self.context.get("request")
        company = getattr(getattr(request, "user", None), "company", None)

        if not company:
            return attrs

        template_in_payload = "service_indemnity_template" in attrs
        selected_template = attrs.get("service_indemnity_template")

        if template_in_payload and company.plan != "ENTERPRISE":
            raise serializers.ValidationError(
                {"service_indemnity_template": "Service-specific indemnity linking is available on Enterprise only."}
            )

        if template_in_payload and selected_template:
            plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
            linked_limit = plan_limits.get('max_linked_service_templates')
            if linked_limit:
                linked_queryset = Service.objects.filter(
                    company=company,
                    service_indemnity_template__isnull=False,
                )
                if self.instance:
                    linked_queryset = linked_queryset.exclude(id=self.instance.id)

                if linked_queryset.count() >= linked_limit:
                    raise serializers.ValidationError(
                        {
                            "service_indemnity_template": (
                                f"Enterprise supports up to {linked_limit} smart-linked service templates. "
                                "Unlink another service or upgrade your custom capacity."
                            )
                        }
                    )

        if selected_template and selected_template.company_id != company.id:
            raise serializers.ValidationError(
                {"service_indemnity_template": "Template must belong to your company."}
            )

        return attrs

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "description",
            "duration_minutes",
            "base_price",
            "is_active",
            "service_indemnity_template",
            "service_indemnity_template_title",
        ]

# core/serializers.py

# core/serializers.py

# core/serializers.py

class BookingStatusSerializer(serializers.ModelSerializer):
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    # 1. Add this to bring the photos back in the response
    indemnity_data = IndemnityAgreementSerializer(source='booking_indemnity', read_only=True)

    class Meta:
        model = Booking
        # 2. Add 'indemnity_data' to the fields list
        fields = ["status", "uploaded_images", "started_at", "completed_at", "indemnity_data"]
        read_only_fields = ["started_at", "completed_at", "indemnity_data"]

    def validate(self, data):
        """
        Check plan limits before allowing the update.
        """
        new_status = data.get('status')
        uploaded_images = data.get('uploaded_images', [])
        request = self.context.get('request')
        
        if new_status == 'COMPLETED' and request:
            company = request.user.company
            plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
            limit = plan_limits.get('max_images_after', 2)

            if len(uploaded_images) > limit:
                raise serializers.ValidationError({
                    "uploaded_images": f"Your {company.plan} plan allows a maximum of {limit} 'After' photos."
                })

        if new_status == 'IN_PROGRESS':
            booking = self.instance
            agreement = getattr(booking, 'booking_indemnity', None)
            if not agreement or not agreement.signature_image:
                raise serializers.ValidationError({
                    "status": "Cannot start booking: client signature is required."
                })

            before_photos_count = agreement.condition_photos.filter(photo_type='BEFORE').count()
            if before_photos_count < 1:
                raise serializers.ValidationError({
                    "status": "Cannot start booking: upload at least one BEFORE image first."
                })
        
        return data

    def update(self, instance, validated_data):
        # 1. Pop photos out so they don't interfere with the Booking save
        images_data = validated_data.pop('uploaded_images', [])
        new_status = validated_data.get('status')
        plan_limits = PLAN_CONFIG.get(instance.company.plan, PLAN_CONFIG['STARTER'])
        max_width = plan_limits.get('max_image_width', 1280)
        max_height = plan_limits.get('max_image_height', 720)
        resized_images_data = [
            resize_image_to_plan_limit(image, max_width, max_height)
            for image in images_data
        ]
        incoming_storage_bytes = sum(int(getattr(image, 'size', 0) or 0) for image in resized_images_data)
        enforce_company_storage_limit(instance.company, incoming_bytes=incoming_storage_bytes)
        from django.utils import timezone

        # 2. Handle Status & Timestamps
        if new_status == 'COMPLETED':
            instance.completed_at = timezone.now()
        elif new_status == 'IN_PROGRESS' and not instance.started_at:
            instance.started_at = timezone.now()

        if new_status and new_status != instance.status:
            instance.change_status(new_status) 

        instance.save()

        # 3. Handle After-Photo Saving
        if resized_images_data:
            agreement = getattr(instance, 'booking_indemnity', None)
            if agreement:
                # Using a transaction is good practice here
                with transaction.atomic():
                    for image_file in resized_images_data:
                        VehiclePhoto.objects.create(
                            agreement=agreement,
                            image=image_file,
                            photo_type='AFTER'
                        )
                # REGENERATE PDF: Now that AFTER photos are saved, update the doc
                generate_agreement_pdf(agreement)

            else:
                # If there's no indemnity, we can't attach photos
                raise serializers.ValidationError({
                    "uploaded_images": "Cannot upload photos: No signed indemnity agreement found for this booking."
                })

        return instance

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=True)
    company_id = serializers.ReadOnlyField(source='company.id')

    # This declaration is correct
    company_name = serializers.CharField(write_only=True, required=False)
    country_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    currency = serializers.CharField(write_only=True, required=False, allow_blank=True)

    plan = serializers.CharField(source='company.plan', read_only=True)
    usage_count = serializers.SerializerMethodField()

    first_name = serializers.CharField(required=True, allow_blank=True)
    last_name = serializers.CharField(required=True, allow_blank=True)
    
    class Meta:
        model = User
        # FIXED THE TYPO HERE: changed 'comapany_name' to 'company_name'
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 
            'password', 'role', 'is_active', 'company_id', 
            'plan', 'usage_count', 'company_name', 'country_code', 'currency'
        ]
        read_only_fields = ['id', 'company_id', 'plan', 'usage_count']
    
    def get_usage_count(self, obj):
        if obj.company:
            return obj.company.get_monthly_booking_count()
        return 0
    
    def validate_is_active(self, value):
        """
        Check that the user isn't deactivating themselves or the last active user.
        """
        instance = self.instance
        request = self.context.get('request')

        # We only care if they are trying to SET is_active to False
        if instance and value is False:
            # 🛡️ 1. Prevent Self-Deactivation
            if request and request.user == instance:
                raise serializers.ValidationError(
                    "Safety Lock: You cannot deactivate your own account. "
                    "Please ask another administrator to do this."
                )

            # 🛡️ 2. Prevent "Ghost Company" (Last active user)
            active_users_left = User.objects.filter(
                company=instance.company, 
                is_active=True
            ).exclude(id=instance.id).count()

            if active_users_left == 0:
                raise serializers.ValidationError(
                    "Operation Denied: This is the last active user in the company. "
                    "You must have at least one active user to maintain account access."
                )

        return value

    def create(self, validated_data):
        from accounts.models import Company, User
        from django.db import transaction

        company_name = validated_data.pop('company_name', None)
        selected_country_code = (validated_data.pop('country_code', '') or 'US').upper()
        selected_currency = (validated_data.pop('currency', '') or '').upper()
        request = self.context.get('request')
        # Check if an authenticated Admin/Owner is performing the action
        admin_user = request.user if request and request.user.is_authenticated else None

        with transaction.atomic():
            # --- SCENARIO A: NEW BUSINESS REGISTRATION ---
            if not admin_user:
                if not company_name:
                    raise serializers.ValidationError({"company_name": "Company name is required for registration."})
                
                # 🛡️ PREVENT DUPLICATES: Check if company name already exists (case-insensitive)
                if Company.objects.filter(name__iexact=company_name).exists():
                    raise serializers.ValidationError({"company_name": "A company with this name is already registered."})

                normalized_currency = 'ZAR' if selected_country_code == 'ZA' else 'USD'
                if selected_currency in {'USD', 'ZAR'}:
                    normalized_currency = selected_currency

                new_company = Company.objects.create(
                    name=company_name,
                    plan='STARTER',
                    country_code=selected_country_code,
                    currency=normalized_currency,
                )
                validated_data['company'] = new_company
                validated_data['role'] = 'OWNER'
                return User.objects.create_user(**validated_data)

            # --- SCENARIO B: ADMIN ADDING STAFF ---
            else:
                company = admin_user.company
                plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
                max_users = plan_limits.get('max_users', 1)
                
                current_user_count = User.objects.filter(company=company).count()
                if current_user_count >= max_users:
                    raise serializers.ValidationError({
                        "plan_limit": f"Your {company.plan} plan allows a maximum of {max_users} team members. Please upgrade."
                    })
                    
                validated_data['company'] = company
                # Ensure the admin can't accidentally create another OWNER if they aren't supposed to
                validated_data.setdefault('role', 'STAFF') 
                return User.objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')

        # Safety lock: an owner cannot demote their own account to staff.
        if (
            request
            and request.user == instance
            and instance.role == 'OWNER'
            and validated_data.get('role') == 'STAFF'
        ):
            raise serializers.ValidationError({
                'role': 'Owner safety lock: You cannot change your own account role to Staff.'
            })

        password = validated_data.pop('password', None)
        # Standard update for other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Only hash the password if it was actually provided
        if password:
            instance.set_password(password)
            
        instance.save()
        return instance
    
    
class CompanySerializer(serializers.ModelSerializer):
    usage_stats = serializers.SerializerMethodField()
    plan_limits = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = ['id', 'name', 'plan', 'plan_limits', 'usage_stats',
                  'booking_buffer', 'opening_time', 'closing_time',
                  'slug', 'website', 'email', 'phone', 'address',
                  'logo', 'is_active', 'created_at', 'country_code', 'currency',
                  'requested_country_code', 'requested_currency', 'location_verification_status',
                  'location_verification_score', 'location_verification_notes', 'location_verified_at',
                  'location_verification_document']
        read_only_fields = [
            'id', 'created_at', 'plan',  # 🔒 CRITICAL: plan is now read-only - changes only via PayPal webhooks
            'requested_country_code', 'requested_currency', 'location_verification_status',
            'location_verification_score', 'location_verification_notes', 'location_verified_at',
            'location_verification_document'
        ]

    def get_usage_stats(self, obj):
        return {
            "monthly_bookings": obj.get_monthly_booking_count(),
            "created_users": obj.users.count(),
            "total_customers": obj.customers.count(),
        }

    def get_plan_limits(self, obj):
        from core.plan_limits import PLAN_CONFIG
        import math
        
        # Get the raw config dictionary
        limits = PLAN_CONFIG.get(obj.plan, PLAN_CONFIG['STARTER']).copy()

        # Sanitize: Convert float('inf') to something JSON-friendly
        for key, value in limits.items():
            if isinstance(value, float) and math.isinf(value):
                limits[key] = None 
        
        return limits
    
    def validate_booking_buffer(self, value):
        # We access the plan from the instance being updated
        if self.instance:
            plan_limits = PLAN_CONFIG.get(self.instance.plan, PLAN_CONFIG['STARTER'])
            if not plan_limits.get('buffer_timer', False) and value != 15: # Assuming 15 is default
                value = 15 # Reset to default if not allowed
                raise serializers.ValidationError(
                    "Custom buffer timers are a PRO feature. Please upgrade your plan."
                )
        return value
    
    def get_logo(self, obj):
        """Return the full URL for the company logo if it exists"""
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
        return None

    def validate(self, attrs):
        company = self.instance
        new_logo = attrs.get('logo')

        if company and new_logo:
            incoming_size = int(getattr(new_logo, 'size', 0) or 0)
            replacing = [company.logo] if company.logo else []
            enforce_company_storage_limit(company, incoming_bytes=incoming_size, replacing_file_fields=replacing)

        return super().validate(attrs)

class MyTokenSerializer(TokenObtainPairSerializer):
    mobile_app = serializers.BooleanField(required=False, default=False, write_only=True)
    remember_me = serializers.BooleanField(required=False, default=True, write_only=True)

    @staticmethod
    def build_user_payload(user):
        return {
            'email': user.email,
            'role': user.role,
            'username': user.username,
            'company_id': user.company.id if user.company else None,
            # Adding plan and usage to the token response for frontend convenience
            'plan': user.company.plan if user.company else 'STARTER',
            'usage': user.company.get_monthly_booking_count() if user.company else 0
        }

    def validate(self, attrs):
        data = super().validate(attrs)

        mobile_app = bool(attrs.get("mobile_app", False))
        remember_me = bool(attrs.get("remember_me", True))

        if mobile_app and remember_me:
            refresh = self.get_token(self.user)
            refresh.set_exp(lifetime=timedelta(days=45))
            data["refresh"] = str(refresh)
            data["access"] = str(refresh.access_token)

        data['user'] = self.build_user_payload(self.user)
        return data

# core/serializers.py
class CompanyPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['name', 'logo', 'opening_time', 'closing_time', 'address', 'phone', 'booking_buffer']

# core/serializers.py
class PublicBookingSerializer(serializers.ModelSerializer):
    # Customer Fields
    customer_firstname = serializers.CharField(write_only=True)
    customer_lastname = serializers.CharField(write_only=True)
    customer_email = serializers.EmailField(write_only=True)
    
    # Vehicle Fields
    vehicle_make = serializers.CharField(write_only=True)
    vehicle_model = serializers.CharField(write_only=True)
    vehicle_registration = serializers.CharField(write_only=True)

    class Meta:
        model = Booking
        fields = [
            'customer_firstname', 'customer_lastname', 'customer_email',
            'vehicle_make', 'vehicle_model', 'vehicle_registration',
            'booking_date', 'booking_time', 'service'
        ]

    def create(self, validated_data):
        # 1. Extract and Remove custom fields from validated_data
        fname = validated_data.pop('customer_firstname')
        lname = validated_data.pop('customer_lastname')
        email = validated_data.pop('customer_email')
        
        v_make = validated_data.pop('vehicle_make')
        v_model = validated_data.pop('vehicle_model')
        v_reg = validated_data.pop('vehicle_registration')
        
        company = validated_data.pop('company') # Passed from view.perform_create

        # 2. Find or Create Customer
        customer, _ = Customer.objects.get_or_create(
            email=email,
            company=company,
            defaults={'firstname': fname, 'lastname': lname}
        )

        # 3. Create the Vehicle for this customer
        # Use get_or_create to avoid duplicates if they book again
        vehicle, _ = Vehicle.objects.get_or_create(
            registration=v_reg,
            customer=customer,
            defaults={
                'make': v_make,
                'model': v_model,
                'year': 2024 # Or add a 'year' field to your public form
            }
        )

        # 4. Handle End Time logic
        service = validated_data['service']
        validated_data["booking_end_time"] = calculate_end_time(
            validated_data["booking_date"], 
            validated_data["booking_time"], 
            service
        )
        
        # 5. Final Create
        return Booking.objects.create(
            company=company,
            customer=customer,
            vehicle=vehicle,
            is_authorized=False, # Public bookings need admin review
            **validated_data
        )