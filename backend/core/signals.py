"""
Signals for booking notifications (email, SMS, app notifications)
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from .models import Booking


@receiver(post_save, sender=Booking)
def send_booking_notifications(sender, instance, created, **kwargs):
    """
    Signal handler: Send notifications when a booking is created or status changes
    """
    from .notifications import broadcast_new_booking_alert, broadcast_booking_status_update
    
    if created:
        # New booking created - notify company and customer
        send_new_booking_email(instance)
        # Send live notification to company dashboard
        broadcast_new_booking_alert(instance)
    else:
        # Booking updated - broadcast status change
        broadcast_booking_status_update(instance)


def send_new_booking_email(booking):
    """Send email to company and customer when new public booking created"""
    try:
        company = booking.company
        customer = booking.customer
        
        # Email to company (notification of new booking)
        company_subject = f"New Booking Request from {customer.firstname} {customer.lastname}"
        company_context = {
            'company_name': company.name,
            'customer_name': f"{customer.firstname} {customer.lastname}",
            'customer_email': customer.email,
            'customer_phone': customer.phone,
            'vehicle': f"{booking.vehicle.make} {booking.vehicle.model}",
            'vehicle_registration': booking.vehicle.registration,
            'service': booking.service.name,
            'booking_date': booking.booking_date,
            'booking_time': booking.booking_time,
            'booking_id': booking.id,
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard/bookings/{booking.id}",
        }
        
        # Email to customer (confirmation of booking submission)
        customer_subject = f"Booking Confirmation - {company.name}"
        customer_context = {
            'customer_name': customer.firstname,
            'company_name': company.name,
            'service': booking.service.name,
            'booking_date': booking.booking_date,
            'booking_time': booking.booking_time,
            'vehicle': f"{booking.vehicle.make} {booking.vehicle.model}",
            'company_phone': company.phone,
            'company_email': company.email if hasattr(company, 'email') else settings.DEFAULT_FROM_EMAIL,
            'track_url': f"{settings.FRONTEND_URL}/public/bookings/{booking.company.slug}?email={customer.email}",
        }
        
        # Render templates
        company_html_message = render_to_string('emails/new_booking_company.html', company_context)
        company_plain_message = strip_tags(company_html_message)
        
        customer_html_message = render_to_string('emails/new_booking_customer.html', customer_context)
        customer_plain_message = strip_tags(customer_html_message)
        
        # Send to company admin (if email exists)
        if company.email:
            send_mail(
                subject=company_subject,
                message=company_plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[company.email],
                html_message=company_html_message,
                fail_silently=True,
            )
        
        # Send to customer
        send_mail(
            subject=customer_subject,
            message=customer_plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[customer.email],
            html_message=customer_html_message,
            fail_silently=True,
        )
        
    except Exception as e:
        print(f"Error sending booking notification emails: {e}")


def send_booking_status_update_email(booking, old_status, new_status):
    """Send email when booking status changes"""
    try:
        # Only send confirmation email when transitioning from PENDING to CONFIRMED
        if new_status == 'CONFIRMED' and old_status in ['PENDING']:
            customer = booking.customer
            company = booking.company
            
            subject = f"Your Booking is Confirmed - {company.name}"
            context = {
                'customer_name': customer.firstname,
                'company_name': company.name,
                'service': booking.service.name,
                'booking_date': booking.booking_date,
                'booking_time': booking.booking_time,
                'company_phone': company.phone,
            }
            
            html_message = render_to_string('emails/booking_confirmed.html', context)
            plain_message = strip_tags(html_message)
            
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[customer.email],
                html_message=html_message,
                fail_silently=True,
            )
    except Exception as e:
        print(f"Error sending booking status update email: {e}")
