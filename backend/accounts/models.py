import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.forms import IntegerField
from django.utils.text import slugify
from django.db.models import Case, When, Value, IntegerField

from core.plan_limits import PLAN_CONFIG

class Company(models.Model):
    LOCATION_VERIFICATION_STATUS = [
        ('NONE', 'None'),
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True)
    website = models.URLField(blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    logo = models.ImageField(upload_to="company_logos/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    opening_time = models.TimeField(default="09:00:00")
    closing_time = models.TimeField(default="17:00:00")
    booking_buffer = models.PositiveIntegerField(default=15)
    
    PLAN_CHOICES = [
        ('STARTER', 'Starter'),
        ('PRO', 'Professional'),
        ('ENTERPRISE', 'Enterprise'),
    ]

    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='STARTER')

    is_subscription_active = models.BooleanField(default=False)
    payfast_token = models.CharField(max_length=255, blank=True, null=True) # To store the token for future recurring payments
    
    # PayPal Subscription fields
    paypal_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    paypal_customer_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Geolocation and Currency
    CURRENCY_CHOICES = [
        ('ZAR', 'South African Rand'),
        ('USD', 'US Dollar'),
    ]
    country_code = models.CharField(max_length=2, default='US', blank=True)  # ISO country code
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    requested_country_code = models.CharField(max_length=2, blank=True, default='')
    requested_currency = models.CharField(max_length=3, blank=True, default='')
    location_verification_document = models.FileField(upload_to='location_verification_docs/', blank=True, null=True)
    location_verification_status = models.CharField(max_length=10, choices=LOCATION_VERIFICATION_STATUS, default='NONE')
    location_verification_score = models.FloatField(default=0.0)
    location_verification_notes = models.TextField(blank=True, default='')
    location_verified_at = models.DateTimeField(blank=True, null=True)

    # 📈 Add this to track usage
    def get_monthly_booking_count(self):
        from core.models import Booking  # Import inside to avoid circular import
        from django.utils import timezone
        now = timezone.now()
        # Count bookings created by this company in the current month
        return Booking.objects.filter(
            company=self, 
            created_at__year=now.year, 
            created_at__month=now.month
        ).count()

    # 🛡️ Centralized Permission Check
    def can_create_booking(self):
        if self.plan == 'STARTER':
            return self.get_monthly_booking_count() < 10
        return True # Pro and Elite are unlimited


    def save(self, *args, **kwargs):
        # 1. Handle Slug Generation
        if not self.slug:
            original_slug = slugify(self.name)
            # Use filter().exists() for better performance than count()
            if Company.objects.filter(slug__iexact=original_slug).exists():
                self.slug = f"{original_slug}-{uuid.uuid4().hex[:6]}"
            else:
                self.slug = original_slug
        
        # 2. Handle Plan Change Logic (Only for existing companies)
        is_new = self._state.adding # More reliable way to check if new record
        
        if not is_new:
            try:
                # We fetch the version currently in the DB to compare
                old_instance = Company.objects.get(pk=self.pk)
                if old_instance.plan != self.plan:
                    plan_limits = PLAN_CONFIG.get(self.plan, PLAN_CONFIG['STARTER'])
                    if not plan_limits.get('buffer_timer', False):
                        self.booking_buffer = 15 
            except Company.DoesNotExist:
                pass

        # 3. Save the Company first!
        super(Company, self).save(*args, **kwargs)
        
        # 4. Seat Enforcement (Only if not brand new, or after user is created)
        if not is_new:
            self.enforce_plan_limits()

    # accounts/models.py

    def enforce_plan_limits(self):
        plan_limits = PLAN_CONFIG.get(self.plan, PLAN_CONFIG['STARTER'])
        # Ensure max_users is at least 1, even if config is missing
        max_users = max(plan_limits.get('max_users', 1), 1) 
        
        # Priority: Owners > Staff > Newest
        all_users = User.objects.filter(company=self).annotate(
            role_priority=Case(
                When(role='OWNER', then=Value(1)),
                When(role='STAFF', then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            )
        ).order_by('role_priority', '-created_at')
        
        users_list = list(all_users)
        total_users = len(users_list)

        for index, user in enumerate(users_list):
            # 🛡️ THE SAFEGUARD: 
            # If this is the only user in the company, they MUST stay active 
            # regardless of the plan limit or their index.
            if total_users == 1:
                new_status = True
            else:
                new_status = (index < max_users)
            
            if user.is_active != new_status:
                user.is_active = new_status
                user.save(update_fields=['is_active'])
                

    def __str__(self):
        return self.name

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", "OWNER") # Superusers should act as Owners in the UI

        # 🔑 Create or get a default company
        from accounts.models import Company
        company, _ = Company.objects.get_or_create(
            name="Platform Admin"
        )

        extra_fields.setdefault("company", company)

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("OWNER", "Owner"),
        ("STAFF", "Staff"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="users"
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    username = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"  # already implied in your previous code
    REQUIRED_FIELDS = ["username"]  # required when creating superusers via createsuperuser

    def __str__(self):
        return self.email