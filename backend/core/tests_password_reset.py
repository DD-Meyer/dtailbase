from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from accounts.models import Company
from core.models import PasswordResetDelivery
from core.password_reset import check_reset_configuration, deliver_password_resets


@override_settings(
    DEBUG=True, FRONTEND_URL="http://localhost:5173",
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    PASSWORD_RESET_TIMEOUT=3600,
)
class PasswordResetTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.company = Company.objects.create(name="Recovery Demo", email="demo@example.com")
        self.user = get_user_model().objects.create_user(
            email="owner@example.com", password="Old-Workshop-Entry-92!",
            username="demo-owner", company=self.company, role="OWNER",
        )

    def request_reset(self, email="owner@example.com"):
        return self.client.post("/api/auth/password-reset/", {"email": email}, format="json")

    def confirm(self, **changes):
        data = {
            "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
            "token": default_token_generator.make_token(self.user),
            "password": "Fresh-Workshop-Entry-75!",
            "password_confirm": "Fresh-Workshop-Entry-75!",
        }
        data.update(changes)
        return self.client.post("/api/auth/password-reset/confirm/", data, format="json")

    def test_request_queues_and_sends_absolute_link(self):
        self.assertEqual(self.request_reset().status_code, 202)
        self.assertEqual(len(mail.outbox) if hasattr(mail, "outbox") else 0, 0)
        self.assertEqual(deliver_password_resets(), 0)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertIn("http://localhost:5173/reset-password#", message.body)
        self.assertIn("60 minutes", message.body)
        self.assertEqual(message.to, [self.user.email])
        self.assertEqual(len(message.alternatives), 1)
        self.assertNotIn("Old-Workshop-Entry", message.body)

    def test_unknown_and_inactive_responses_do_not_reveal_account(self):
        active = self.request_reset()
        unknown = self.request_reset("absent@example.com")
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        inactive = self.request_reset()
        self.assertEqual(active.data, unknown.data)
        self.assertEqual(active.data, inactive.data)
        self.assertEqual(deliver_password_resets(), 0)
        self.assertEqual(len(mail.outbox) if hasattr(mail, "outbox") else 0, 0)

    def test_invalid_email_does_not_queue(self):
        self.assertEqual(self.request_reset("not-an-email").status_code, 400)
        self.assertFalse(PasswordResetDelivery.objects.exists())

    def test_non_object_request_bodies_are_validation_errors(self):
        for body in (["owner@example.com"], "owner@example.com"):
            response = self.client.post("/api/auth/password-reset/", body, format="json")
            self.assertEqual(response.status_code, 400)
        self.assertFalse(PasswordResetDelivery.objects.exists())

    def test_ip_throttle_enforces_the_exact_shared_limit(self):
        for index in range(20):
            self.assertEqual(self.request_reset(f"absent-{index}@example.com").status_code, 202)
        self.assertEqual(self.request_reset("another@example.com").status_code, 429)
        self.assertEqual(self.confirm().status_code, 429)
        self.assertEqual(PasswordResetDelivery.objects.count(), 20)

    @override_settings(FRONTEND_URL="https://app.example.com/untrusted-path")
    def test_frontend_origin_cannot_include_a_path(self):
        with self.assertLogs("core.password_reset", level="ERROR"):
            self.assertEqual(self.request_reset().status_code, 503)
        self.assertFalse(PasswordResetDelivery.objects.exists())

    @override_settings(
        DEBUG=False, FRONTEND_URL="https://app.example.com",
        EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
    )
    def test_production_rejects_unshared_cache_and_conflicting_tls(self):
        for backend in ("django.core.cache.backends.locmem.LocMemCache",
                        "django.core.cache.backends.dummy.DummyCache"):
            with self.settings(CACHES={"default": {"BACKEND": backend}}):
                with self.assertLogs("core.password_reset", level="ERROR"):
                    self.assertEqual(self.request_reset().status_code, 503)
        with self.settings(
            EMAIL_USE_TLS=True, EMAIL_USE_SSL=True,
            CACHES={"default": {"BACKEND": "django.core.cache.backends.db.DatabaseCache",
                                "LOCATION": "dtailbase_cache"}},
        ):
            with self.assertRaises(ImproperlyConfigured):
                check_reset_configuration()
        self.assertFalse(PasswordResetDelivery.objects.exists())

    def test_reset_updates_password_and_link_cannot_be_reused(self):
        token = default_token_generator.make_token(self.user)
        self.assertEqual(self.confirm(token=token).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Fresh-Workshop-Entry-75!"))
        self.assertFalse(self.user.check_password("Old-Workshop-Entry-92!"))
        self.assertEqual(self.confirm(token=token).status_code, 400)

    def test_invalid_expired_and_inactive_links(self):
        self.assertEqual(self.confirm(uid="%%%").status_code, 400)
        self.assertEqual(self.confirm(token="bad-token").status_code, 400)
        with patch.object(default_token_generator, "_now", return_value=timezone.now().replace(tzinfo=None) - timedelta(hours=2)):
            expired = default_token_generator.make_token(self.user)
        self.assertEqual(self.confirm(token=expired).status_code, 400)
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.assertEqual(self.confirm().status_code, 400)

    def test_password_validation_and_confirmation(self):
        self.assertEqual(self.confirm(password_confirm="different").status_code, 400)
        self.assertEqual(self.confirm(password="12345678", password_confirm="12345678").status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Old-Workshop-Entry-92!"))

    def test_per_email_throttle_is_case_insensitive(self):
        for _ in range(3):
            self.assertEqual(self.request_reset().status_code, 202)
        self.assertEqual(self.request_reset("OWNER@example.com").status_code, 429)

    def test_smtp_failure_is_logged_and_delivery_remains_queued(self):
        self.request_reset()
        with patch("core.password_reset.EmailMultiAlternatives.send", side_effect=OSError("SMTP unavailable")):
            with self.assertLogs("core.password_reset", level="ERROR") as logs:
                self.assertEqual(deliver_password_resets(), 1)
        item = PasswordResetDelivery.objects.get()
        self.assertIsNone(item.finished_at)
        self.assertEqual(item.attempts, 1)
        self.assertGreater(item.next_attempt_at, timezone.now())
        self.assertNotIn(self.user.email, str(logs.output))

    @override_settings(DEBUG=False)
    def test_invalid_production_configuration_is_account_neutral(self):
        known = self.request_reset()
        unknown = self.request_reset("absent@example.com")
        self.assertEqual(known.status_code, 503)
        self.assertEqual(known.data, unknown.data)
        self.assertFalse(PasswordResetDelivery.objects.exists())

    def test_unusable_password_and_stale_deliveries_are_not_sent(self):
        self.user.set_unusable_password()
        self.user.save(update_fields=["password"])
        self.request_reset()
        PasswordResetDelivery.objects.create(email="owner@example.com", created_at=timezone.now() - timedelta(hours=2))
        deliver_password_resets()
        self.assertEqual(len(mail.outbox) if hasattr(mail, "outbox") else 0, 0)
