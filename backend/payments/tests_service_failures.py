from unittest.mock import Mock, patch

import requests
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings

from payments import geolocation
from payments.paypal_service import get_paypal_access_token, verify_paypal_webhook


@override_settings(CACHES={"default": {
    "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    "LOCATION": "geolocation-regressions",
}})
class GeolocationFailureTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        key = patch.object(geolocation, "IPSTACK_API_KEY", "test-secret-key")
        key.start()
        self.addCleanup(key.stop)
        request = patch("payments.geolocation.requests.get")
        self.get = request.start()
        self.addCleanup(request.stop)
        self.response = Mock(status_code=200, headers={})
        self.response.json.return_value = {"country_code": "ZA"}
        self.get.return_value = self.response

    def test_success_uses_https_and_preserves_success_cache(self):
        self.assertEqual(geolocation.get_geoip_data("192.0.2.1"), {"country_code": "ZA"})
        self.assertEqual(geolocation.get_geoip_data("192.0.2.1"), {"country_code": "ZA"})
        self.get.assert_called_once_with(
            "https://api.ipstack.com/192.0.2.1",
            params={"access_key": "test-secret-key"}, timeout=5,
        )

    def test_rate_limit_honors_retry_after_and_stops_requests_for_other_ips(self):
        self.response.status_code = 429
        self.response.headers = {"Retry-After": "120"}
        with patch.object(cache, "set", wraps=cache.set) as set_cache:
            with self.assertLogs("payments.geolocation", level="WARNING"):
                self.assertEqual(geolocation.get_geoip_data("192.0.2.1"), {})
            set_cache.assert_called_once_with(geolocation.RATE_LIMIT_CACHE_KEY, True, 120)
        self.assertEqual(geolocation.get_geoip_data("192.0.2.2"), {})
        self.get.assert_called_once()
        cache.delete(geolocation.RATE_LIMIT_CACHE_KEY)
        self.response.status_code = 200
        self.assertEqual(geolocation.get_geoip_data("192.0.2.2"), {"country_code": "ZA"})

    def test_rate_limit_uses_bounded_cooldown_for_missing_or_invalid_retry_after(self):
        for header, expected in ((None, 300), ("invalid", 300), ("99999", 3600), ("-1", 1)):
            with self.subTest(header=header):
                cache.clear()
                self.response.status_code = 429
                self.response.headers = {} if header is None else {"Retry-After": header}
                with patch.object(cache, "set") as set_cache:
                    with self.assertLogs("payments.geolocation", level="WARNING"):
                        self.assertEqual(geolocation.get_geoip_data("192.0.2.1"), {})
                    set_cache.assert_called_once_with(geolocation.RATE_LIMIT_CACHE_KEY, True, expected)

    def test_cached_success_still_available_during_provider_cooldown(self):
        cache.set("geoip_data_192.0.2.1", {"country_code": "ZA"})
        cache.set(geolocation.RATE_LIMIT_CACHE_KEY, True)
        self.assertEqual(geolocation.get_geoip_data("192.0.2.1"), {"country_code": "ZA"})
        self.get.assert_not_called()

    def test_request_errors_do_not_log_urls_or_keys_and_are_cached_briefly(self):
        for error in (requests.HTTPError, requests.ConnectionError, requests.JSONDecodeError):
            with self.subTest(error=error.__name__):
                cache.clear()
                self.get.side_effect = (
                    error("invalid json", "test-secret-key", 0)
                    if error is requests.JSONDecodeError
                    else error("https://api.ipstack.com/192.0.2.1?access_key=test-secret-key")
                )
                with patch.object(cache, "set", wraps=cache.set) as set_cache:
                    with self.assertLogs("payments.geolocation", level="ERROR") as logs:
                        self.assertEqual(geolocation.get_geoip_data("192.0.2.1"), {})
                    set_cache.assert_called_once_with("geoip_data_192.0.2.1", {}, 300)
                self.assertNotIn("test-secret-key", str(logs.output))
                self.assertNotIn("access_key", str(logs.output))
                calls = self.get.call_count
                self.assertEqual(geolocation.get_geoip_data("192.0.2.1"), {})
                self.assertEqual(self.get.call_count, calls)

    def test_api_errors_and_malformed_payloads_use_short_failure_cache(self):
        for payload in ({"error": {"info": "test-secret-key"}}, [], None):
            with self.subTest(payload=payload):
                cache.clear()
                self.response.json.return_value = payload
                with patch.object(cache, "set") as set_cache:
                    with self.assertLogs("payments.geolocation", level="WARNING") as logs:
                        self.assertEqual(geolocation.get_geoip_data("192.0.2.1"), {})
                    set_cache.assert_called_once_with("geoip_data_192.0.2.1", {}, 300)
                self.assertNotIn("test-secret-key", str(logs.output))


@override_settings(
    PAYPAL_MODE="sandbox", PAYPAL_CLIENT_ID="test-client",
    PAYPAL_CLIENT_SECRET="test-secret", PAYPAL_WEBHOOK_ID="test-webhook",
)
class PayPalFailureTests(SimpleTestCase):
    def test_token_dns_failure_returns_no_token(self):
        with patch("payments.paypal_service.requests.post", side_effect=requests.ConnectionError("DNS failed")):
            with self.assertLogs("payments.paypal_service", level="ERROR"):
                self.assertIsNone(get_paypal_access_token())

    def test_unsuccessful_webhook_verification_remains_rejected(self):
        headers = {
            "PAYPAL-TRANSMISSION-ID": "test-id",
            "PAYPAL-TRANSMISSION-TIME": "2026-10-15T09:00:00Z",
            "PAYPAL-TRANSMISSION-SIG": "test-signature",
            "PAYPAL-CERT-URL": "https://api.paypal.com/test-cert",
            "PAYPAL-AUTH-ALGO": "SHA256withRSA",
        }
        for status, expected in (("FAILURE", False), ("SUCCESS", True)):
            with self.subTest(status=status):
                response = Mock()
                response.json.return_value = {"verification_status": status}
                with patch("payments.paypal_service.get_paypal_access_token", return_value="test-token"):
                    with patch("payments.paypal_service.requests.post", return_value=response):
                        if not expected:
                            with self.assertLogs("payments.paypal_service", level="ERROR"):
                                self.assertFalse(verify_paypal_webhook({"id": "test-event"}, headers))
                        else:
                            self.assertTrue(verify_paypal_webhook({"id": "test-event"}, headers))
