"""
ASGI config for dtailbase project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Django ASGI app
django_asgi_app = get_asgi_application()

# Import routing after Django setup
from core.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    # HTTP requests (using standard Django ASGI app)
    'http': django_asgi_app,
    
    # WebSocket connections (using Channels consumers)
    'websocket': AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
