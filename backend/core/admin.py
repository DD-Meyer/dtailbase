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

# Register remaining models
admin.site.register(Service)
admin.site.register(Vehicle)