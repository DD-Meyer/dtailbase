from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.forms import ValidationError
from .models import Company, User

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'plan', 'is_subscription_active', 'created_at')
    search_fields = ('name', 'email')
    prepopulated_fields = {'slug': ('name',)}

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