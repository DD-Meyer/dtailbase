# call views in this url file
from django.urls import path
from django.views.decorators.csrf import csrf_exempt

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
    path('subscribe/', csrf_exempt(PayPalSubscribeView.as_view()), name='paypal_subscribe'),
    path('cancel-subscription/', csrf_exempt(PayPalCancelSubscriptionView.as_view()), name='paypal_cancel_subscription'),
    path('billing-summary/', BillingSummaryView.as_view(), name='billing_summary'),
    path('confirm/', csrf_exempt(PayPalConfirmView.as_view()), name='paypal_confirm'),
    path('webhook/', csrf_exempt(PayPalWebhookView.as_view()), name='paypal_webhook'),

    # Deprecated PayFast endpoint
    path('payfast-initiate/', csrf_exempt(PayFastCheckoutView.as_view()), name='payfast_initiate'),
]