from datetime import date, time

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Company, User
from core.models import Booking, Customer, Service, Vehicle


class DeleteProtectionTests(APITestCase):
	def setUp(self):
		self.company = Company.objects.create(
			name="Acme Detailing",
			email="owner@acme.test",
		)
		self.user = User.objects.create_user(
			email="owner@acme.test",
			password="secret123",
			username="owner",
			first_name="Owner",
			last_name="User",
			role="OWNER",
			company=self.company,
		)
		self.client.force_authenticate(self.user)

		self.customer = Customer.objects.create(
			company=self.company,
			firstname="Jane",
			lastname="Driver",
			email="jane@test.com",
			phone="1234567890",
		)
		self.service = Service.objects.create(
			company=self.company,
			name="Full Detail",
			description="",
			duration_minutes=90,
			base_price="250.00",
			is_active=True,
		)
		self.vehicle = Vehicle.objects.create(
			customer=self.customer,
			make="BMW",
			model="320i",
			year=2022,
			registration="ABC123GP",
		)
		self.booking = Booking.objects.create(
			company=self.company,
			customer=self.customer,
			vehicle=self.vehicle,
			service=self.service,
			booking_date=date.today(),
			booking_time=time(10, 0),
			booking_end_time=time(11, 30),
			status="PENDING",
			created_by=self.user,
		)

	def test_customer_delete_with_existing_booking_returns_reason(self):
		response = self.client.delete(f"/api/customers/{self.customer.id}/")

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn("existing bookings", response.data["error"])

	def test_vehicle_delete_with_existing_booking_returns_reason(self):
		response = self.client.delete(f"/api/vehicles/{self.vehicle.id}/")

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn("existing bookings", response.data["error"])

	def test_service_delete_with_existing_booking_deactivates_service(self):
		response = self.client.delete(f"/api/services/{self.service.id}/")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn("deactivated instead", response.data["message"])
		self.service.refresh_from_db()
		self.assertFalse(self.service.is_active)

	def test_service_list_can_include_inactive_for_management(self):
		self.service.is_active = False
		self.service.save(update_fields=["is_active"])

		active_only_response = self.client.get("/api/services/")
		include_inactive_response = self.client.get("/api/services/?include_inactive=1")

		self.assertEqual(active_only_response.status_code, status.HTTP_200_OK)
		self.assertEqual(include_inactive_response.status_code, status.HTTP_200_OK)
		self.assertEqual(active_only_response.data, [])
		self.assertEqual(len(include_inactive_response.data), 1)
		self.assertFalse(include_inactive_response.data[0]["is_active"])
