import logging
import smtplib
from collections.abc import Mapping
from datetime import timedelta
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.crypto import salted_hmac
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from .models import PasswordResetDelivery

logger = logging.getLogger(__name__)


class ResetIpThrottle(SimpleRateThrottle):
    scope = "password_reset_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class ResetEmailThrottle(SimpleRateThrottle):
    scope = "password_reset_email"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "") if isinstance(request.data, Mapping) else "").strip().lower()
        key = salted_hmac(self.scope, email).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": key}


class ResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


class ResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=128)
    token = serializers.CharField(max_length=128)
    password = serializers.CharField(trim_whitespace=False, max_length=128, write_only=True)
    password_confirm = serializers.CharField(trim_whitespace=False, max_length=128, write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs


def check_reset_configuration():
    origin = urlsplit(settings.FRONTEND_URL)
    if (origin.scheme not in {"http", "https"} or not origin.netloc
            or origin.username or origin.password or origin.query or origin.fragment
            or origin.path not in {"", "/"}):
        raise ImproperlyConfigured("FRONTEND_URL must be a trusted application origin.")
    if not settings.DEBUG:
        if origin.scheme != "https":
            raise ImproperlyConfigured("Password reset requires an HTTPS FRONTEND_URL in production.")
        if settings.EMAIL_BACKEND != "django.core.mail.backends.smtp.EmailBackend":
            raise ImproperlyConfigured("Password reset requires the SMTP email backend in production.")
        if any(kind in settings.CACHES["default"]["BACKEND"] for kind in ("locmem", "dummy")):
            raise ImproperlyConfigured("Password reset throttling requires a shared production cache.")
        if settings.EMAIL_USE_TLS and settings.EMAIL_USE_SSL:
            raise ImproperlyConfigured("SMTP must use either STARTTLS or implicit TLS, not both.")


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ResetIpThrottle, ResetEmailThrottle]

    def post(self, request):
        serializer = ResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        assert isinstance(data, dict)
        try:
            check_reset_configuration()
        except ImproperlyConfigured:
            logger.error("Password reset configuration is unavailable.")
            return Response({"detail": "Password recovery is temporarily unavailable. Please try again later."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        # Queue all syntactically valid addresses so the response cannot reveal account eligibility.
        PasswordResetDelivery.objects.create(email=data["email"].strip().lower())
        return Response({"detail": "If this email belongs to an eligible account, reset instructions have been requested. Check your inbox and spam folder."},
                        status=status.HTTP_202_ACCEPTED)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ResetIpThrottle]

    def post(self, request):
        serializer = ResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        assert isinstance(data, dict)
        User = get_user_model()
        pk_field = User._meta.pk
        assert pk_field is not None
        try:
            uid = urlsafe_base64_decode(data["uid"]).decode()
            user_id = pk_field.to_python(uid)
        except (ValueError, UnicodeDecodeError, ValidationError, OverflowError):
            return Response({"detail": "This reset link is invalid or expired. Request a new link."}, status=400)
        with transaction.atomic():
            user = User.objects.select_for_update().filter(pk=user_id, is_active=True).first()
            if (user is None or not user.has_usable_password()
                    or not default_token_generator.check_token(user, data["token"])):
                return Response({"detail": "This reset link is invalid or expired. Request a new link."}, status=400)
            try:
                validate_password(data["password"], user=user)
            except ValidationError as error:
                return Response({"password": error.messages}, status=400)
            user.set_password(data["password"])
            user.save(update_fields=["password"])
        return Response({"detail": "Password updated. You can now sign in with your new password."})


def deliver_password_resets(limit=100):
    """Drain a durable outbox; SMTP failures remain visible and retryable."""
    check_reset_configuration()
    failures = 0
    for _ in range(limit):
        with transaction.atomic():
            delivery = (PasswordResetDelivery.objects.select_for_update()
                        .filter(finished_at__isnull=True, next_attempt_at__lte=timezone.now())
                        .order_by("next_attempt_at").first())
            if delivery is None:
                break
            now = timezone.now()
            User = get_user_model()
            user = User.objects.filter(email__iexact=delivery.email, is_active=True).first()
            if (now - delivery.created_at > timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT)
                    or user is None or not user.has_usable_password()):
                delivery.finished_at = now
            else:
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                # A URL fragment is not sent to the server, referrer, or analytics on initial navigation.
                reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password#{uid}/{token}"
                context = {"reset_url": reset_url, "expiry_minutes": settings.PASSWORD_RESET_TIMEOUT // 60}
                email = EmailMultiAlternatives(
                    subject="Reset your DtailBase password",
                    body=render_to_string("emails/password_reset.txt", context),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[delivery.email],
                )
                email.attach_alternative(render_to_string("emails/password_reset.html", context), "text/html")
                try:
                    sent = email.send(fail_silently=False)
                    if sent != 1:
                        raise OSError("Email backend did not accept the message.")
                except (smtplib.SMTPException, OSError):
                    failures += 1
                    delivery.attempts += 1
                    delivery.next_attempt_at = now + timedelta(seconds=min(60 * 2 ** min(delivery.attempts, 6), 3600))
                    logger.error("Password reset email delivery failed; outbox item %s scheduled for retry.", delivery.pk)
                else:
                    delivery.finished_at = now
            delivery.save(update_fields=["attempts", "next_attempt_at", "finished_at"])
    PasswordResetDelivery.objects.filter(created_at__lt=timezone.now() - timedelta(days=1)).delete()
    return failures
