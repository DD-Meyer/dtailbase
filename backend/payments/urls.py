# call views in this url file
from django.urls import path
from django.views.decorators.csrf import csrf_exempt

from .views import (
    PayPalSubscribeView,
    PayPalCancelSubscriptionView,
    BillingSummaryView,
    PayPalConfirmView,
    PayPalWebhookView,
    PayPalWebhookDebugView,
    PlansView,  # Use PlansView for plan/pricing info
    PayFastCheckoutView  # Keep for backward compatibility
)

from .payfast_views import (
    PayFastSubscribeView,
    PayFastCancelSubscriptionView,
    PayFastBillingSummaryView,
    PayFastConfirmView,
    PayFastNotifyView,
)

# PayFast handles all subscription transactions. The legacy PayPal views remain
# importable but are no longer routed.
urlpatterns = [
    path('plans/', PlansView.as_view(), name='plans'),
    path('subscribe/', csrf_exempt(PayFastSubscribeView.as_view()), name='payfast_subscribe'),
    path('cancel-subscription/', csrf_exempt(PayFastCancelSubscriptionView.as_view()), name='payfast_cancel_subscription'),
    path('billing-summary/', PayFastBillingSummaryView.as_view(), name='billing_summary'),
    path('confirm/', csrf_exempt(PayFastConfirmView.as_view()), name='payfast_confirm'),
    path('payfast/notify/', csrf_exempt(PayFastNotifyView.as_view()), name='payfast_notify'),
    path('payfast-initiate/', csrf_exempt(PayFastCheckoutView.as_view()), name='payfast_initiate'),
]