# core/templatetags/booking_tags.py
from django import template

register = template.Library()

@register.filter
def short_ref(value):
    """
    Converts a UUID into a short, 8-character uppercase reference.
    Usage: {{ booking.id|short_ref }}
    """
    if not value:
        return ""
    # Convert to string, take first 8 chars, and make uppercase
    return str(value)[:8].upper()