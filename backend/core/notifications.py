"""
Notification utilities for sending live updates via WebSocket channels
"""
import json
from datetime import datetime
from asgiref.sync import async_to_sync
from django.core.cache import cache

try:
    from channels.layers import get_channel_layer
except ImportError:
    get_channel_layer = None


def send_company_notification(company_id, notification_type, **kwargs):
    """
    Send a notification to all connected users in a company
    
    Args:
        company_id: Company UUID
        notification_type: Type of notification (booking_created, booking_updated, etc.)
        **kwargs: Additional data to send with notification
    """
    try:
        channel_layer = get_channel_layer()
        
        async def _send():
            await channel_layer.group_send(
                f"company_{company_id}_notifications",
                {
                    'type': notification_type,
                    'timestamp': datetime.now().isoformat(),
                    **kwargs,
                }
            )
        
        async_to_sync(_send)()
    except Exception as e:
        print(f"Error sending company notification: {e}")


def send_booking_notification(booking_id, notification_type, **kwargs):
    """
    Send a notification to all users watching a specific booking
    
    Args:
        booking_id: Booking UUID
        notification_type: Type of notification (booking_update, status_change, etc.)
        **kwargs: Additional data to send with notification
    """
    try:
        channel_layer = get_channel_layer()
        
        async def _send():
            await channel_layer.group_send(
                f"booking_{booking_id}",
                {
                    'type': notification_type,
                    'booking_id': str(booking_id),
                    'timestamp': datetime.now().isoformat(),
                    **kwargs,
                }
            )
        
        async_to_sync(_send)()
    except Exception as e:
        print(f"Error sending booking notification: {e}")


def send_public_booking_notification(booking_id, notification_type, **kwargs):
    """
    Send a notification to public booking customers
    
    Args:
        booking_id: Booking UUID or reference code
        notification_type: Type of notification (status_change, chat_message, etc.)
        **kwargs: Additional data to send with notification
    """
    try:
        channel_layer = get_channel_layer()
        
        async def _send():
            await channel_layer.group_send(
                f"booking_public_{booking_id}",
                {
                    'type': notification_type,
                    'timestamp': datetime.now().isoformat(),
                    **kwargs,
                }
            )
        
        async_to_sync(_send)()
    except Exception as e:
        print(f"Error sending public booking notification: {e}")


def broadcast_booking_status_update(booking):
    """
    Broadcast booking status update to company staff and customer
    
    Args:
        booking: Booking instance
    """
    try:
        # Notify company staff
        send_company_notification(
            booking.company.id,
            'booking_update',
            booking_id=str(booking.id),
            status=booking.status,
            customer_name=f"{booking.customer.firstname} {booking.customer.lastname}",
            message=f"Booking status updated to {booking.get_status_display()}",
        )
        
        # Notify customer (if it's a public booking)
        if not booking.is_authorized:
            status_labels = {
                'PENDING': 'Pending',
                'CONFIRMED': 'Confirmed',
                'IN_PROGRESS': 'In Progress',
                'COMPLETED': 'Completed',
                'CANCELLED': 'Cancelled',
            }
            
            send_public_booking_notification(
                str(booking.id),
                'booking_status_change',
                status=booking.status,
                status_label=status_labels.get(booking.status, booking.status),
                message=f"Your booking status has been updated to {status_labels.get(booking.status)}",
            )
    except Exception as e:
        print(f"Error broadcasting booking status update: {e}")


def broadcast_new_booking_alert(booking):
    """
    Broadcast new booking alert to company staff
    
    Args:
        booking: Newly created Booking instance
    """
    try:
        send_company_notification(
            booking.company.id,
            'booking_created',
            booking_id=str(booking.id),
            customer_name=f"{booking.customer.firstname} {booking.customer.lastname}",
            service=booking.service.name,
            booking_date=str(booking.booking_date),
            booking_time=str(booking.booking_time),
            message=f"New booking from {booking.customer.firstname} {booking.customer.lastname}",
        )
    except Exception as e:
        print(f"Error broadcasting new booking alert: {e}")


PLATFORM_ADMIN_SUPPORT_GROUP = "platform_admins_support"


def broadcast_support_message(ticket, message_row, sender):
    """Broadcast a new support ticket message to both parties (company + platform admins)."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        payload = {
            'type': 'support_message',
            'event': 'support_message',
            'ticket_id': str(ticket.id),
            'company_id': str(ticket.company_id),
            'company_name': ticket.company.name,
            'ticket_subject': ticket.subject,
            'support_lane': ticket.support_lane,
            'ticket_status': ticket.status,
            'message_id': str(message_row.id),
            'message': message_row.message,
            'is_admin_reply': bool(message_row.is_admin_reply),
            'sender_email': sender.email if sender else 'Unknown',
            'created_at': message_row.created_at.isoformat() if message_row.created_at else None,
        }

        async def _send():
            # Notify the customer's company group
            await channel_layer.group_send(
                f"company_{ticket.company_id}_notifications",
                payload,
            )
            # Notify any connected platform admins
            await channel_layer.group_send(PLATFORM_ADMIN_SUPPORT_GROUP, payload)

        async_to_sync(_send)()
    except Exception as e:
        print(f"Error broadcasting support message: {e}")


def broadcast_support_ticket_created(ticket, created_by):
    """Broadcast that a new support ticket was opened (so admins see it instantly)."""
    try:
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        payload = {
            'type': 'support_ticket_created',
            'event': 'support_ticket_created',
            'ticket_id': str(ticket.id),
            'company_id': str(ticket.company_id),
            'company_name': ticket.company.name,
            'ticket_subject': ticket.subject,
            'support_lane': ticket.support_lane,
            'ticket_status': ticket.status,
            'created_by_email': created_by.email if created_by else 'Unknown',
            'created_at': ticket.created_at.isoformat() if ticket.created_at else None,
        }

        async def _send():
            await channel_layer.group_send(
                f"company_{ticket.company_id}_notifications",
                payload,
            )
            await channel_layer.group_send(PLATFORM_ADMIN_SUPPORT_GROUP, payload)

        async_to_sync(_send)()
    except Exception as e:
        print(f"Error broadcasting support ticket created: {e}")
