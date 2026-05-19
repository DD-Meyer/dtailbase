"""
WebSocket consumers for real-time notifications
Handles: Live booking status updates, customer notifications
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for live notifications
    Handles authenticated users receiving real-time updates
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        # Extract user from JWT token
        user = await self.get_user_from_token()
        
        if user and user.is_authenticated:
            self.user = user
            self.company_id = user.company.id if hasattr(user, 'company') else None
            
            if self.company_id:
                # Add user to company notification group
                await self.channel_layer.group_add(
                    f"company_{self.company_id}_notifications",
                    self.channel_name
                )
                await self.accept()
            else:
                await self.close()
        else:
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if self.company_id:
            await self.channel_layer.group_discard(
                f"company_{self.company_id}_notifications",
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Receive messages from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                # Keep-alive ping
                await self.send(text_data=json.dumps({'type': 'pong'}))
            elif message_type == 'subscribe':
                # Subscribe to specific booking updates
                booking_id = data.get('booking_id')
                if booking_id:
                    await self.channel_layer.group_add(
                        f"booking_{booking_id}",
                        self.channel_name
                    )
        except json.JSONDecodeError:
            pass
    
    async def booking_update(self, event):
        """Handle booking update event"""
        await self.send(text_data=json.dumps({
            'type': 'booking_update',
            'booking_id': event.get('booking_id'),
            'status': event.get('status'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp'),
        }))
    
    async def booking_created(self, event):
        """Handle new booking created event"""
        await self.send(text_data=json.dumps({
            'type': 'booking_created',
            'booking_id': event.get('booking_id'),
            'customer_name': event.get('customer_name'),
            'service': event.get('service'),
            'message': event.get('message'),
        }))
    
    async def notification_message(self, event):
        """Handle generic notification event"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'title': event.get('title'),
            'message': event.get('message'),
            'level': event.get('level', 'info'),  # info, success, warning, error
        }))
    
    @database_sync_to_async
    def get_user_from_token(self):
        """Extract user from JWT token in query string"""
        try:
            # Get token from query string
            query_string = self.scope.get('query_string', b'').decode()
            params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
            token = params.get('token')
            
            if not token:
                return AnonymousUser()
            
            # Authenticate token
            jwt_auth = JWTAuthentication()
            from rest_framework.request import Request
            from django.test import RequestFactory
            
            request = RequestFactory().get('/')
            request.META['HTTP_AUTHORIZATION'] = f'Bearer {token}'
            
            try:
                validated_token = jwt_auth.get_validated_token(token)
                user = jwt_auth.get_user(validated_token)
                return user
            except (InvalidToken, AuthenticationFailed):
                return AnonymousUser()
        except Exception:
            return AnonymousUser()


class PublicNotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for public/customer notifications
    Allows customers to receive updates on their bookings without authentication
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        # Get booking reference from query parameters
        query_string = self.scope.get('query_string', b'').decode()
        params = dict(param.split('=') for param in query_string.split('&') if '=' in param)
        
        self.booking_reference = params.get('booking_ref')
        self.customer_email = params.get('email')
        
        if self.booking_reference:
            # Add to booking-specific group
            await self.channel_layer.group_add(
                f"booking_public_{self.booking_reference}",
                self.channel_name
            )
            await self.accept()
        else:
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if self.booking_reference:
            await self.channel_layer.group_discard(
                f"booking_public_{self.booking_reference}",
                self.channel_name
            )
    
    async def booking_status_change(self, event):
        """Handle booking status change notification"""
        await self.send(text_data=json.dumps({
            'type': 'status_change',
            'status': event.get('status'),
            'status_label': event.get('status_label'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp'),
        }))
    
    async def chat_message(self, event):
        """Handle incoming chat message"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'sender': event.get('sender'),
            'message': event.get('message'),
            'timestamp': event.get('timestamp'),
        }))
