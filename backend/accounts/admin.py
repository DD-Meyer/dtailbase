from django.contrib import admin
from django.contrib import messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.forms import ValidationError
from .models import Company, User

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'plan', 'is_subscription_active', 'pending_downgrade_plan', 'subscription_ends_at', 'created_at')
    search_fields = ('name', 'email')
    prepopulated_fields = {'slug': ('name',)}

    fieldsets = (
        ('General', {
            'fields': ('name', 'slug', 'website', 'email', 'phone', 'address', 'logo', 'is_active'),
        }),
        ('Business Hours', {
            'fields': ('opening_time', 'closing_time', 'booking_buffer'),
        }),
        ('Subscription', {
            'fields': (
                'plan',
                'is_subscription_active',
                'paypal_subscription_id',
                'paypal_customer_id',
                'pending_downgrade_plan',
                'subscription_ends_at',
            ),
        }),
        ('Location & Currency', {
            'fields': (
                'country_code', 'currency',
                'requested_country_code', 'requested_currency',
                'location_verification_document',
                'location_verification_status',
                'location_verification_score',
                'location_verification_notes',
                'location_verified_at',
            ),
        }),
    )

    def save_model(self, request, obj, form, change):
        if change and 'plan' in form.changed_data:
            try:
                old = Company.objects.get(pk=obj.pk)
                old_plan = old.plan
            except Company.DoesNotExist:
                old_plan = None

            new_plan = obj.plan

            if old_plan and old_plan != new_plan and obj.paypal_subscription_id:
                from payments.paypal_service import cancel_subscription
                result = cancel_subscription(obj.paypal_subscription_id)
                if result.get('success'):
                    obj.paypal_subscription_id = ''
                    obj.paypal_customer_id = ''
                    obj.pending_downgrade_plan = ''
                    obj.subscription_ends_at = None
                    if new_plan == 'STARTER':
                        obj.is_subscription_active = False
                    messages.success(
                        request,
                        f'Plan changed {old_plan} → {new_plan}. '
                        f'PayPal subscription cancelled. '
                        f'Company must re-subscribe to activate a new billing agreement.'
                    )
                else:
                    obj.pending_downgrade_plan = ''
                    obj.subscription_ends_at = None
                    if new_plan == 'STARTER':
                        obj.is_subscription_active = False
                    messages.warning(
                        request,
                        f'Plan changed {old_plan} → {new_plan} locally, but PayPal cancellation '
                        f'failed: {result.get("error", "unknown error")}. '
                        f'Please cancel the subscription manually on the PayPal dashboard.'
                    )
            elif old_plan and old_plan != new_plan:
                # No PayPal subscription — just update local state.
                obj.pending_downgrade_plan = ''
                obj.subscription_ends_at = None
                if new_plan == 'STARTER':
                    obj.is_subscription_active = False

        super().save_model(request, obj, form, change)

@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    # 1. Configuration for the list view
    list_display = ('email', 'first_name', 'last_name', 'company', 'role', 'is_active', 'is_staff', 'is_superuser')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser', 'company')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

    # 2. Re-defining Fieldsets to match YOUR model fields exactly
    # This removes references to 'date_joined', 'groups', and 'user_permissions'
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'username')}),
        ('Company Info', {'fields': ('company', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'created_at')}),
    )

    # Required because 'created_at' and 'last_login' are read-only
    readonly_fields = ('created_at', 'last_login')

    # 3. Defining what fields show when ADDING a user through admin
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'username', 'company', 'role', 'is_active', 'is_staff', 'is_superuser'),
        }),
    )

    # 4. Your custom deactivation logic
    def save_model(self, request, obj, form, change):
        if change and obj.is_active is False:
            other_active_owners = User.objects.filter(
                company=obj.company, 
                role='OWNER', 
                is_active=True
            ).exclude(id=obj.id).count()
            
            if other_active_owners == 0 and obj.role == 'OWNER':
                # Note: This will show a 500 error page if triggered. 
                # Consider adding a custom form if you want a pretty message.
                raise ValidationError("You cannot deactivate the last active Owner.")
        
        super().save_model(request, obj, form, change)