from rest_framework import permissions

from accounts.models import Company

class IsCompanyUser(permissions.BasePermission):
    """
    Allows access only to users who belong to the same company as the object.
    Platform superusers can access everything.
    """

    def has_object_permission(self, request, view, obj):
        # Superusers bypass company restriction
        if request.user.is_superuser:
            return True
        
        # If the object is the Company itself
        if isinstance(obj, Company):
            return obj == getattr(request.user, "company", None)

        # Check if the object has a company attribute
        if hasattr(obj, "company"):
            return obj.company == getattr(request.user, "company", None)

        # For objects related to a customer
        if hasattr(obj, "customer") and hasattr(obj.customer, "company"):
            return obj.customer.company == getattr(request.user, "company", None)

        # For objects related to a service
        if hasattr(obj, "service") and hasattr(obj.service, "company"):
            return obj.service.company == getattr(request.user, "company", None)

        return False

    def has_permission(self, request, view):
        # Superuser bypass
        if request.user.is_superuser:
            return True

        # For list and create, user must have a company
        return getattr(request.user, "company", None) is not None

class CanUpdateBookingStatus(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # 1. User must be logged in
        if not request.user.is_authenticated:
            return False

        # 2. Superusers always allowed
        if request.user.is_superuser:
            return True

        # 3. Ensure the booking belongs to the user's company
        user_company = getattr(request.user, "company", None)
        if hasattr(obj, "company"):
            return obj.company == user_company
        
        return False
    
# permissions.py

class IsAccountAdmin(permissions.BasePermission):
    """
    Permission to allow access only to users with the 'OWNER' role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'OWNER'  # Changed from 'ADMIN' to 'OWNER'
        )