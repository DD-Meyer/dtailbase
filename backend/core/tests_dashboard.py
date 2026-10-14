from datetime import date, time
from decimal import Decimal
from unittest.mock import patch

from rest_framework.response import Response
from rest_framework.test import APIClient, APITestCase

from accounts.models import Company, User
from core.models import Booking, Customer, Service, Vehicle


class DashboardTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Demo Studio", email="studio@example.test", currency="ZAR")
        self.user = User(
            email="dashboard@example.test", username="dashboard", company=self.company, role="OWNER"
        )
        self.user.set_unusable_password()
        self.user.save()
        self.customer = Customer.objects.create(
            company=self.company, firstname="Maya", lastname="Bennett",
            email="maya@example.test", phone="123456",
        )
        self.vehicle = Vehicle.objects.create(
            customer=self.customer, make="BMW", model="M3", year=2022, registration="DEMO01"
        )
        self.service = Service.objects.create(
            company=self.company, name="Detail", duration_minutes=90, base_price="10.25"
        )
        self.api_client = APIClient()
        self.api_client.force_authenticate(self.user)

    def booking(self, day="2026-10-14", status="CONFIRMED", **kwargs):
        return Booking.objects.create(
            company=self.company, customer=self.customer, vehicle=self.vehicle,
            service=self.service, booking_date=day, booking_time=time(10),
            booking_end_time=time(11, 30), status=status, **kwargs,
        )

    def get_dashboard(self, **params) -> Response:
        response = self.api_client.get("/api/dashboard/", {"today": "2026-10-14", **params})
        assert isinstance(response, Response)
        return response

    def dashboard_data(self, **params):
        response = self.get_dashboard(**params)
        assert isinstance(response.data, dict)
        return response.data

    def test_exact_totals_status_exclusions_and_currency(self):
        for status in ("PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"):
            self.booking(status=status)
        response = self.get_dashboard()
        self.assertEqual(response.status_code, 200)
        data = response.data
        assert isinstance(data, dict)
        self.assertEqual(data["kpis"], {"jobs": 4, "estimated_value": "41.00", "pending": 1})
        self.assertEqual(data["currency"], "ZAR")
        self.assertEqual(data["month_counts"], [{"date": "2026-10-14", "count": 4}])
        self.assertEqual(data["agenda"]["count"], 4)
        self.assertEqual(data["agenda"]["status_counts"]["CANCELLED"], 1)
        self.assertIsNone(data["week"]["change_percent"])
        self.assertEqual(len(data["week"]["days"]), 7)
        self.assertEqual(data["week"]["days"][2]["estimated_value"], "41.00")
        self.assertNotIn("admin_signature", data["agenda"]["items"][0])
        self.assertNotIn("customer_address", data["agenda"]["items"][0])

    def test_comparison_and_current_price_estimates(self):
        self.booking()
        self.booking(day="2026-10-07")
        self.assertEqual(self.dashboard_data()["week"]["change_percent"], "0.0")
        self.service.base_price = Decimal("20.50")
        self.service.save()
        self.assertEqual(self.dashboard_data()["kpis"]["estimated_value"], "20.50")

    def test_company_isolation(self):
        other = Company.objects.create(name="Other", email="other@example.test")
        booking = self.booking()
        booking.company = other
        booking.save()
        data = self.dashboard_data()
        self.assertEqual(data["kpis"]["jobs"], 0)
        self.assertEqual(data["agenda"]["items"], [])
        self.assertEqual(data["month_counts"], [])

    def test_date_validation(self):
        for params in (
            {"today": "2026-02-30"}, {"today": "20261014"}, {"date": "invalid"},
            {"month": "2026-13"}, {"month": "2026-2"}, {"today": "0001-01-01"},
            {"status": "INVALID"}, {"page": "0"}, {"page": "no"},
        ):
            with self.subTest(params=params):
                self.assertEqual(self.get_dashboard(**params).status_code, 400)

    def test_leap_day_and_year_week_boundary(self):
        self.booking(day="2024-02-29")
        data = self.dashboard_data(today="2024-02-29")
        self.assertEqual(data["month_counts"][0]["date"], "2024-02-29")
        data = self.dashboard_data(today="2027-01-01")
        self.assertEqual(data["week"]["start"], "2026-12-28")
        self.assertEqual(data["week"]["end"], "2027-01-03")
        self.assertEqual(data["week"]["days"][0]["count"], 0)

    def test_filter_order_and_bounded_pagination(self):
        self.booking(status="CANCELLED")
        Booking.objects.bulk_create([
            Booking(
                company=self.company, customer=self.customer, vehicle=self.vehicle,
                service=self.service, booking_date=date(2026, 10, 14),
                booking_time=time(8 if index == 0 else 10), booking_end_time=time(12),
                status="CONFIRMED",
            ) for index in range(51)
        ])
        data = self.dashboard_data()["agenda"]
        self.assertEqual(data["count"], 51)
        self.assertEqual(len(data["items"]), 50)
        self.assertEqual(data["items"][0]["booking_time"], "08:00:00")
        self.assertEqual(data["next_page"], 2)
        self.assertEqual(len(self.dashboard_data(page=2)["agenda"]["items"]), 1)
        self.assertEqual(self.dashboard_data(status="CANCELLED")["agenda"]["count"], 1)
        self.assertEqual(self.dashboard_data(status="ALL")["agenda"]["count"], 52)

    def test_authentication_required(self):
        self.api_client.force_authenticate(None)
        self.assertIn(self.get_dashboard().status_code, (401, 403))

    def test_company_required_even_for_platform_admin(self):
        self.user.is_superuser = True
        with patch.object(User, "company", None):
            self.assertEqual(self.get_dashboard().status_code, 403)
