"""
URL configuration for dtailbase project.

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
# Serve Media Files + Vite build assets BEFORE the catch-all.
# In production WhiteNoise (WHITENOISE_ROOT=frontend_build) handles /assets/, /sw.js, etc.
# In DEBUG mode WhiteNoise is disabled so we add explicit serve() patterns here instead.
if settings.DEBUG:
    import os
    from django.views.static import serve as _serve
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Explicitly serve /static/ via the staticfiles finder so admin/DRF CSS
    # works even if the runserver StaticFilesHandler wrapper is bypassed.
    urlpatterns += staticfiles_urlpatterns()
    _fb = os.path.join(settings.BASE_DIR, 'frontend_build')
    urlpatterns += [
        # Vite-built bundles and hashed assets (JS/CSS/images)
        re_path(r'^assets/(?P<path>.*)$', _serve, {'document_root': os.path.join(_fb, 'assets')}),
        # PWA / icon assets
        re_path(r'^icons/(?P<path>.*)$', _serve, {'document_root': os.path.join(_fb, 'icons')}),
        # Landing page assets (if any)
        re_path(r'^landing/(?P<path>.*)$', _serve, {'document_root': os.path.join(_fb, 'landing')}),
        # Root-level files that WhiteNoise would serve in production
        re_path(r'^(?P<path>sw\.js)$', _serve, {'document_root': _fb}),
        re_path(r'^(?P<path>manifest\.webmanifest)$', _serve, {'document_root': _fb}),
        re_path(r'^(?P<path>vite\.svg)$', _serve, {'document_root': _fb}),
    ]

# THE CATCH-ALL: Keep this at the very bottom so media/api routes match first
urlpatterns += [
    re_path(
        r'^(?!api/|admin/|media/|static/).*$',
        TemplateView.as_view(template_name='index.html'),
        name='home',
    ),
]
