# call views in this url file
from django.urls import path
from .views import (
    PayPalSubscribeView, 
    PayPalCancelSubscriptionView,
    PayPalConfirmView,
    PayPalWebhookView, 
    PricingView,
    PayFastCheckoutView  # Keep for backward compatibility
)

urlpatterns = [
    # PayPal Endpoints
    path('pricing/', PricingView.as_view(), name='pricing'),
    path('subscribe/', PayPalSubscribeView.as_view(), name='paypal_subscribe'),
    path('cancel-subscription/', PayPalCancelSubscriptionView.as_view(), name='paypal_cancel_subscription'),
    path('confirm/', PayPalConfirmView.as_view(), name='paypal_confirm'),
    path('webhook/', PayPalWebhookView.as_view(), name='paypal_webhook'),
    
    # Deprecated PayFast endpoint
    path('payfast-initiate/', PayFastCheckoutView.as_view(), name='payfast_initiate'),
]