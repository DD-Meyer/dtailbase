# call views in this url file
from django.urls import path
from .views import PayFastCheckoutView

urlpatterns = [
    path('payfast-initiate/', PayFastCheckoutView.as_view(), name='payfast_initiate'),
]