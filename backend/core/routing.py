"""
WebSocket URL routing for Django Channels
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Authenticated user notifications
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
    
    # Public booking status updates (for customers)
    re_path(r'ws/public/booking/(?P<booking_ref>[^/]+)/$', consumers.PublicNotificationConsumer.as_asgi()),
]
