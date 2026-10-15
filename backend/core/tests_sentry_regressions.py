import os
import runpy
from datetime import time, timedelta
from pathlib import Path
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Company, User
from core.models import Booking, Customer, Service, Vehicle
from indemnity.models import IndemnityAgreement, IndemnityTemplate


@override_settings(
    CHANNEL_LAYERS={"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}},
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class BookingAndAgreementReadTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Read Tests", plan="PRO")
        self.user = User.objects.create(
            email="reads@example.test", username="reads", company=self.company, role="OWNER",
        )
        self.client.force_authenticate(self.user)
        self.customer = Customer.objects.create(
            company=self.company, firstname="Test", lastname="Customer",
        )
        self.vehicle = Vehicle.objects.create(
            customer=self.customer, make="BMW", model="M3", year=2022, registration="READ01",
        )
        self.service = Service.objects.create(
            company=self.company, name="Detail", duration_minutes=60, base_price="95.00",
        )
        self.template = IndemnityTemplate.objects.create(
            company=self.company, title="Terms", body_html="<p>Terms</p>", version=1,
        )

    def booking(self):
        return Booking.objects.create(
            company=self.company, customer=self.customer, vehicle=self.vehicle,
            service=self.service, booking_date="2026-10-14",
            booking_time=time(9), booking_end_time=time(10),
        )

    def agreement(self):
        return IndemnityAgreement.objects.create(
            company=self.company, customer=self.customer,
            booking=self.booking(), template=self.template,
        )

    def test_booking_list_query_count_does_not_grow_with_customers(self):
        self.agreement()
        with self.assertNumQueries(1):
            response = self.client.get("/api/bookings/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["customer_name"], "Test")
        for index in range(4):
            customer = Customer.objects.create(
                company=self.company, firstname=f"Customer{index}", lastname="Other",
            )
            booking = self.booking()
            booking.customer = customer
            booking.save(update_fields=["customer"])
        with self.assertNumQueries(1):
            response = self.client.get("/api/bookings/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 5)

    def test_booking_detail_loads_nested_vehicle_customer_and_template(self):
        agreement = self.agreement()
        with self.assertNumQueries(3):
            response = self.client.get(f"/api/bookings/{agreement.booking_id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["vehicle"]["customer"]["firstname"], "Test")
        self.assertEqual(response.data["indemnity_data"]["template_body_html"], "<p>Terms</p>")

    def test_agreement_history_orders_by_signed_at_and_applies_plan_limit(self):
        agreements = [self.agreement() for _ in range(7)]
        now = timezone.now()
        for index, agreement in enumerate(agreements):
            IndemnityAgreement.objects.filter(pk=agreement.pk).update(
                signed_at=now - timedelta(days=index),
            )
        with self.assertNumQueries(2):
            response = self.client.get("/api/indemnity/agreements/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.data],
            [str(agreement.pk) for agreement in agreements[:5]],
        )
        self.assertTrue(all(item["template_body_html"] == "<p>Terms</p>" for item in response.data))

    def test_starter_agreement_history_stays_empty(self):
        self.agreement()
        self.company.plan = "STARTER"
        self.company.save(update_fields=["plan"])
        response = self.client.get("/api/indemnity/agreements/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_agreement_history_is_company_scoped(self):
        self.agreement()
        self.user.company = Company.objects.create(name="Other Read Tests", plan="PRO")
        response = self.client.get("/api/indemnity/agreements/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])


class DatabaseConnectionSettingsTests(SimpleTestCase):
    def database_settings(self, *, debug, database_url, max_age=None):
        env = {
            "DEBUG": str(debug),
            "DATABASE_URL": database_url,
            "USE_POSTGRES": "True",
        }
        with patch.dict(os.environ, env):
            os.environ.pop("DB_CONN_MAX_AGE", None)
            if max_age is not None:
                os.environ["DB_CONN_MAX_AGE"] = str(max_age)
            with patch("dotenv.load_dotenv"), patch("sentry_sdk.init"):
                settings = runpy.run_path(str(Path(__file__).with_name("settings.py")))
        return settings["DATABASES"]["default"]

    def test_defaults_preserve_development_and_production_lifetimes(self):
        for database_url in ("", "postgresql://user:password@localhost/test"):
            for debug, expected in ((True, 0), (False, 600)):
                with self.subTest(database_url=bool(database_url), debug=debug):
                    self.assertEqual(
                        self.database_settings(debug=debug, database_url=database_url)["CONN_MAX_AGE"],
                        expected,
                    )

    def test_connection_lifetime_override_applies_to_both_postgres_configurations(self):
        for database_url in ("", "postgresql://user:password@localhost/test"):
            for max_age in (0, 60):
                with self.subTest(database_url=bool(database_url), max_age=max_age):
                    self.assertEqual(
                        self.database_settings(
                            debug=False, database_url=database_url, max_age=max_age,
                        )["CONN_MAX_AGE"],
                        max_age,
                    )
