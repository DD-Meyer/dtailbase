from django.db.models import BooleanField, Case, Exists, OuterRef, Value, When
from rest_framework import serializers

from .models import Booking, VehiclePhoto


def with_start_readiness(queryset):
    before_photos = VehiclePhoto.objects.filter(
        agreement__booking_id=OuterRef("pk"), photo_type="BEFORE",
    ).exclude(agreement__signature_image="").exclude(agreement__signature_image__isnull=True)
    return queryset.annotate(can_start=Case(
        When(status="CONFIRMED", then=Exists(before_photos)),
        default=Value(False), output_field=BooleanField(),
    ))


def validate_job_transition(booking, new_status):
    if not new_status or new_status == booking.status:
        return
    if new_status not in Booking.VALID_STATUS_TRANSITIONS.get(booking.status, []):
        raise serializers.ValidationError({
            "status": f"Cannot change {booking.status} to {new_status}. Reload this job.",
        })
    if new_status == "IN_PROGRESS":
        agreement = getattr(booking, "booking_indemnity", None)
        if not agreement or not agreement.signature_image:
            raise serializers.ValidationError({"status": "Cannot start booking: client signature is required."})
        if not agreement.condition_photos.filter(photo_type="BEFORE").exists():
            raise serializers.ValidationError({"status": "Cannot start booking: upload at least one BEFORE image first."})
