import calendar
import re
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from rest_framework import permissions, serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking
from .permissions import IsCompanyUser
from .job_status import with_start_readiness


def calendar_date(value, field):
    if not value or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValidationError({field: "Use YYYY-MM-DD."})
    try:
        result = date.fromisoformat(value)
    except ValueError:
        raise ValidationError({field: "Enter a valid calendar date."})
    if not 1900 <= result.year <= 2100:
        raise ValidationError({field: "Choose a year between 1900 and 2100."})
    return result


class DashboardBookingSerializer(serializers.ModelSerializer):
    can_start = serializers.BooleanField(read_only=True)
    customer_name = serializers.ReadOnlyField(source="customer.firstname")
    customer_lastname = serializers.ReadOnlyField(source="customer.lastname")
    service_name = serializers.ReadOnlyField(source="service.name")
    estimated_value = serializers.DecimalField(
        source="service.base_price", max_digits=10, decimal_places=2, read_only=True
    )
    vehicle_details = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "customer_name", "customer_lastname", "service_name",
            "estimated_value", "vehicle_details", "booking_date", "booking_time",
            "booking_end_time", "status", "location_type", "can_start", "started_at", "completed_at",
        ]

    def get_vehicle_details(self, obj):
        return {
            "make": obj.vehicle.make,
            "model": obj.vehicle.model,
            "registration": obj.vehicle.registration,
        }


def money(value):
    return str((value or Decimal("0")).quantize(Decimal("0.01")))


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCompanyUser]

    def get(self, request):
        company = getattr(request.user, "company", None)
        if company is None:
            raise PermissionDenied("A company is required to view this dashboard.")
        today = calendar_date(request.query_params.get("today"), "today")
        selected = calendar_date(request.query_params.get("date", today.isoformat()), "date")
        month = request.query_params.get("month", selected.strftime("%Y-%m"))
        if not re.fullmatch(r"\d{4}-\d{2}", month):
            raise ValidationError({"month": "Use YYYY-MM."})
        month_start = calendar_date(f"{month}-01", "month")
        month_end = month_start.replace(day=calendar.monthrange(month_start.year, month_start.month)[1])
        status = request.query_params.get("status", "ACTIVE")
        if status not in {"ACTIVE", "ALL", *dict(Booking.STATUS_CHOICES)}:
            raise ValidationError({"status": "Choose a valid booking status."})
        try:
            page = int(request.query_params.get("page", "1"))
        except ValueError:
            raise ValidationError({"page": "Enter a positive page number."})
        if not 1 <= page <= 10000:
            raise ValidationError({"page": "Choose a page between 1 and 10000."})

        bookings = Booking.objects.filter(company=company)
        active = bookings.exclude(status="CANCELLED")
        today_bookings = active.filter(booking_date=today)
        totals = today_bookings.aggregate(count=Count("id"), value=Sum("service__base_price"))
        week_start = today - timedelta(days=today.weekday())
        previous_start = week_start - timedelta(days=7)
        daily = {
            row["booking_date"]: row
            for row in active.filter(
                booking_date__range=(previous_start, week_start + timedelta(days=6))
            ).values("booking_date").annotate(count=Count("id"), value=Sum("service__base_price"))
        }

        def series(start):
            return [
                {
                    "date": (day := start + timedelta(days=offset)).isoformat(),
                    "count": daily.get(day, {}).get("count", 0),
                    "estimated_value": money(daily.get(day, {}).get("value")),
                }
                for offset in range(7)
            ]

        current_series, previous_series = series(week_start), series(previous_start)
        current_value = sum(Decimal(day["estimated_value"]) for day in current_series)
        previous_value = sum(Decimal(day["estimated_value"]) for day in previous_series)
        month_counts = [
            {"date": row["booking_date"].isoformat(), "count": row["count"]}
            for row in active.filter(booking_date__range=(month_start, month_end))
            .values("booking_date").annotate(count=Count("id")).order_by("booking_date")
        ]
        day_bookings = bookings.filter(booking_date=selected)
        status_counts = dict(
            day_bookings.values("status").annotate(count=Count("id")).values_list("status", "count")
        )
        if status == "ACTIVE":
            day_bookings = day_bookings.exclude(status="CANCELLED")
        elif status != "ALL":
            day_bookings = day_bookings.filter(status=status)
        count = day_bookings.count()
        page_size = 50
        offset = (page - 1) * page_size
        items = with_start_readiness(day_bookings).select_related("customer", "vehicle", "service").order_by(
            "booking_time", "id"
        )[offset:offset + page_size]
        return Response({
            "today": today.isoformat(),
            "currency": company.currency,
            "kpis": {
                "jobs": totals["count"],
                "estimated_value": money(totals["value"]),
                "pending": today_bookings.filter(status="PENDING").count(),
            },
            "week": {
                "start": week_start.isoformat(),
                "end": (week_start + timedelta(days=6)).isoformat(),
                "days": current_series,
                "previous_days": previous_series,
                "estimated_value": money(current_value),
                "previous_estimated_value": money(previous_value),
                "change_percent": (
                    str(((current_value - previous_value) / previous_value * 100).quantize(Decimal("0.1")))
                    if previous_value else None
                ),
            },
            "month": month,
            "month_counts": month_counts,
            "agenda": {
                "date": selected.isoformat(), "status_counts": status_counts,
                "count": count, "page": page,
                "next_page": page + 1 if offset + page_size < count else None,
                "items": DashboardBookingSerializer(items, many=True).data,
            },
        })
