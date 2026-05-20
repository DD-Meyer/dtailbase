# core/urls.py
from django.urls import path, include
from .views import *
from .support_views import (
    AdminSupportInboxView,
    AdminSupportOverviewView,
    SupportTicketDetailUpdateView,
    SupportTicketListCreateView,
    SupportTicketMessageListCreateView,
)
from rest_framework.routers import DefaultRouter
from indemnity.views import *

router = DefaultRouter()
# Change 'companies' to 'company'
router.register(r'company', CompanyViewSet, basename='company')

urlpatterns = [
    path("company/team/", CompanyTeamListView.as_view(), name="team-list"),
    path("company/team/<uuid:pk>/", CompanyUserDetailView.as_view(), name="team-detail"),
    path("company/location-verification/", CompanyLocationVerificationView.as_view(), name="company-location-verification"),
    path("company/account-lifecycle/", CompanyAccountLifecycleView.as_view(), name="company-account-lifecycle"),

    # Public Endpoints
    # Note: These are intentionally placed before the authenticated endpoints to avoid any potential conflicts with URL patterns.
    path("public/company/<slug:slug>/", CompanyPublicDetailView.as_view(), name="public-company-detail"),
    path("public/services/", ServicePublicListView.as_view(), name="public-services-list"),
    path("public/availability/<str:date>/<uuid:service_id>/", PublicAvailabilityView.as_view(), name="public-availability"),
    path("public/book/<slug:company_slug>/", PublicBookingCreateView.as_view(), name="public-booking-create"),
    path("public/bookings/<slug:company_slug>/", PublicCustomerBookingsView.as_view(), name="public-customer-bookings"),

    path("auth/users/me/", UserMeView.as_view(), name="user-me"),
    path("auth/google-config/", GoogleAuthConfigView.as_view(), name="google-config"),
    path("auth/google-login/", GoogleLoginView.as_view(), name="google-login"),
    path("support/tickets/", SupportTicketListCreateView.as_view(), name="support-ticket-list-create"),
    path("support/tickets/<uuid:ticket_id>/", SupportTicketDetailUpdateView.as_view(), name="support-ticket-detail-update"),
    path("support/tickets/<uuid:ticket_id>/messages/", SupportTicketMessageListCreateView.as_view(), name="support-ticket-message-list-create"),
    path("support/admin/inbox/", AdminSupportInboxView.as_view(), name="support-admin-inbox"),
    path("support/admin/overview/", AdminSupportOverviewView.as_view(), name="support-admin-overview"),
    path("availability/<str:date>/", AvailabilityAPIView.as_view()),

    path('auth/set-password/', ChangePasswordView.as_view(), name='set-password'),

    path("customers/<uuid:customer_id>/vehicles/", CustomerVehicleListAPIView.as_view()),
    path("customers/template-csv/", CustomerCsvTemplateAPIView.as_view(), name="customers-template-csv"),
    path("customers/import-csv/", CustomerCsvImportAPIView.as_view(), name="customers-import-csv"),
    path("customers/<uuid:customer_id>/", CustomerDetailAPIView.as_view(), name="customer-detail"),
    path("customers/", CustomerListAPIView.as_view(), name="customers-list-create"),
    path("bookings/", BookingListCreateAPIView.as_view()),
    path("services/", ServiceListCreateAPIView.as_view(), name="service-list"),
    path("services/<uuid:pk>/", ServiceRetrieveUpdateDestroyAPIView.as_view(), name="service-detail"),
    
    path("availability/<str:date>/<uuid:service>/", AvailabilityAPIView.as_view()),
    path("bookings/<uuid:pk>/", BookingRetrieveUpdateDestroyAPIView.as_view(), name="booking-detail"),
    path("vehicles/<uuid:pk>/", VehicleRetrieveUpdateDestroyAPIView.as_view(), name="vehicle-detail"),
    path("vehicles/", VehicleListCreateAPIView.as_view(), name="vehicle-list-create"),
    path("bookings/<uuid:pk>/status/", BookingStatusUpdateView.as_view()),
    path('bookings/<uuid:pk>/update_status/', BookingStatusUpdateView.as_view(), name='booking-status-update'),
    
    # New user registration endpoint
    path("users/", UserCreateAPIView.as_view(), name="user-register"),
    path('admin/companies/', CompanyCreateAPIView.as_view(), name='company-create'),
    path('', include(router.urls)),
    
]