from django.db import models
import uuid
from accounts.models import *
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, timedelta
from indemnity.models import *

# Create your models here.

class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="customers"
    )
    firstname = models.CharField(max_length=255)
    lastname = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def full_name(self):
        return f"{self.firstname} {self.lastname}"

    def __str__(self):
        return self.full_name


class Service(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="services"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    requires_indemnity = models.BooleanField(default=True)
    service_indemnity_template = models.ForeignKey(
        "indemnity.IndemnityTemplate",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="services",
    )
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Booking(models.Model):
    constraints = [
            models.UniqueConstraint(
                fields=["vehicle", "booking_date"],
                name="unique_vehicle_per_day"
            )
        ]
    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("CONFIRMED", "Confirmed"),
        ("IN_PROGRESS", "In_progress"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    )

    VALID_STATUS_TRANSITIONS = {
        "PENDING": ["CONFIRMED", "CANCELLED"],
        "CONFIRMED": ["IN_PROGRESS", "CANCELLED"],
        "IN_PROGRESS": ["COMPLETED"],
        "COMPLETED": [],
        "CANCELLED": [],
    }

    admin_signature = models.TextField(null=True, blank=True) # Stores the Base64 string
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_authorized = models.BooleanField(default=False)

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="bookings"
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="bookings"
    )
    vehicle = models.ForeignKey(
        "Vehicle",
        on_delete=models.PROTECT,  # don't delete bookings if vehicle is removed
        related_name="bookings",
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT
    )
    booking_date = models.DateField()
    booking_time = models.TimeField()
    booking_end_time = models.TimeField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    LOCATION_CHOICES = (
        ('ONSITE', 'On-site at Company'),
        ('MOBILE', 'Mobile at Customer Location'),
    )
    location_type = models.CharField(
        max_length=10,
        choices=LOCATION_CHOICES,
        default='ONSITE'
    )
    customer_address = models.TextField(blank=True, default='')

    # models.py

    def change_status(self, new_status):
        new_status = new_status.upper()
        if self.status == new_status:
            return  

        now = timezone.now()
        # We start with status; we add timestamps as needed
        update_list = ['status'] 

        if new_status == "IN_PROGRESS":
            self.started_at = now
            update_list.append('started_at')
        elif new_status == "COMPLETED":
            self.completed_at = now
            update_list.append('completed_at')
        elif new_status == "CANCELLED":
            self.cancelled_at = now
            update_list.append('cancelled_at')

        self.status = new_status
        # save only the fields we actually touched
        self.save(update_fields=update_list)

    def __str__(self):
        return f"{self.customer} - {self.service} ({self.vehicle})"


class Vehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    customer = models.ForeignKey(
        "core.Customer",
        on_delete=models.CASCADE,
        related_name="vehicles"
    )

    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    registration = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.make} {self.model} ({self.registration})"


#Re-add your VehiclePhoto model if you want to store multiple condition photos
class VehiclePhoto(models.Model):
    PHOTO_TYPES = (
        ('BEFORE', 'Before Service'),
        ('AFTER', 'After Service'),
    )

    agreement = models.ForeignKey(
        'indemnity.IndemnityAgreement', 
        related_name='condition_photos', 
        on_delete=models.CASCADE
    )
    image = models.ImageField(upload_to='vehicle_photos/')
    photo_type = models.CharField(
        max_length=10, 
        choices=PHOTO_TYPES, 
        default='BEFORE'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.photo_type} - {self.agreement.booking.id}"


class SupportTicket(models.Model):
    STATUS_CHOICES = (
        ("OPEN", "Open"),
        ("IN_PROGRESS", "In Progress"),
        ("RESOLVED", "Resolved"),
        ("CLOSED", "Closed"),
    )

    SUPPORT_LANE_CHOICES = (
        ("PRIORITY", "Priority"),
        ("STANDARD", "Standard"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="support_tickets",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_support_tickets",
    )
    subject = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="OPEN")
    support_lane = models.CharField(max_length=20, choices=SUPPORT_LANE_CHOICES, default="STANDARD")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.company and self.company.plan == "ENTERPRISE":
            self.support_lane = "PRIORITY"
        else:
            self.support_lane = "STANDARD"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.subject}"


class SupportTicketMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_messages",
    )
    message = models.TextField()
    is_admin_reply = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message for ticket {self.ticket_id}"