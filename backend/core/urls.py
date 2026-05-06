"""
URL configuration for detely project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.urls import re_path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from core.serializers import MyTokenSerializer


class MyTokenView(TokenObtainPairView):
    serializer_class = MyTokenSerializer


urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/indemnity/', include('indemnity.urls')),
    path('api/payments/', include('payments.urls')),

    path('api/', include('core.api_urls')),

    path('api/token/', MyTokenView.as_view(), name='token_obtain_pair'),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]

# This allows Django to serve files during development
# Serve Media Files (Add this BEFORE the catch-all)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# THE CATCH-ALL: Keep this at the very bottom so media/api routes match first
urlpatterns += [
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html'), name='home'),
]
