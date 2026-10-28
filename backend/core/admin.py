from django.contrib import admin
from .models import *
from indemnity.models import IndemnityAgreement

# 1. Define the Inline for Indemnity (from the other app)
class IndemnityInline(admin.StackedInline):
    model = IndemnityAgreement
    can_delete = False
    extra = 0

class VehicleInline(admin.TabularInline):
    model = Vehicle
    extra = 0

# 2. Merged BookingAdmin - One registration only!
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "vehicle",
        "service",
        "booking_date",
        "status",
    )
    list_filter = ("status", "booking_date")
    
    # This adds the Indemnity Agreement & Photos section inside the Booking page
    inlines = [IndemnityInline]

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "vehicle":
            # Case 1: Editing existing booking
            if request.resolver_match.kwargs.get("object_id"):
                booking_id = request.resolver_match.kwargs["object_id"]
                try:
                    booking = Booking.objects.get(pk=booking_id)
                    kwargs["queryset"] = Vehicle.objects.filter(
                        customer=booking.customer
                    )
                except Booking.DoesNotExist:
                    kwargs["queryset"] = Vehicle.objects.none()

            # Case 2: Creating new booking with ?customer=UUID
            elif request.GET.get("customer"):
                kwargs["queryset"] = Vehicle.objects.filter(
                    customer_id=request.GET["customer"]
                )

            # Case 3: No customer yet
            else:
                kwargs["queryset"] = Vehicle.objects.none()

        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("firstname", "lastname", "company")
    inlines = [VehicleInline]

@admin.register(PlanConfiguration)
class PlanConfigurationAdmin(admin.ModelAdmin):
    """Single place to edit plan pricing, limits and feature lists."""
    list_display = ("plan", "price", "monthly_bookings", "max_users", "max_customers", "buffer_timer")
    fieldsets = (
        (None, {"fields": ("plan", "price", "prices", "features")}),
        ("Usage limits", {"fields": ("monthly_bookings", "max_users", "max_customers",
                                     "indemnity_history_limit", "max_linked_service_templates",
                                     "storage_limit_gb", "buffer_timer")}),
        ("Photos", {"fields": ("max_images_before", "max_images_after", "max_image_width", "max_image_height")}),
    )

    def get_readonly_fields(self, request, obj=None):
        return ("plan",) if obj else ()

    def has_delete_permission(self, request, obj=None):
        return False

    def has_add_permission(self, request):
        return PlanConfiguration.objects.count() < len(PlanConfiguration.PLAN_CHOICES)


# Register remaining models
admin.site.register(Service)
admin.site.register(Vehicle)