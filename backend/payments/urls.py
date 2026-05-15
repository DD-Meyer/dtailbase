# call views in this url file
from django.urls import path

from .views import (
    PayPalSubscribeView,
    PayPalCancelSubscriptionView,
    BillingSummaryView,
    PayPalConfirmView,
    PayPalWebhookView,
    PlansView,  # Use PlansView for plan/pricing info
    PayFastCheckoutView  # Keep for backward compatibility
)

urlpatterns = [
    # PayPal Endpoints
    path('plans/', PlansView.as_view(), name='plans'),
    path('subscribe/', PayPalSubscribeView.as_view(), name='paypal_subscribe'),
    path('cancel-subscription/', PayPalCancelSubscriptionView.as_view(), name='paypal_cancel_subscription'),
    path('billing-summary/', BillingSummaryView.as_view(), name='billing_summary'),
    path('confirm/', PayPalConfirmView.as_view(), name='paypal_confirm'),
    path('webhook/', PayPalWebhookView.as_view(), name='paypal_webhook'),

    # Deprecated PayFast endpoint
    path('payfast-initiate/', PayFastCheckoutView.as_view(), name='payfast_initiate'),
]