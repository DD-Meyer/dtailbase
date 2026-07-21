from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Company, User


class BillingPermissionsTests(APITestCase):
	def setUp(self):
		self.company = Company.objects.create(
			name="Billing Co",
			email="owner@billingco.test",
			plan="PRO",
			is_subscription_active=True,
			paypal_subscription_id="I-TESTSUBSCRIPTION",
		)

		self.owner = User.objects.create_user(
			email="owner@billingco.test",
			password="secret123",
			username="owner",
			first_name="Owner",
			last_name="User",
			role="OWNER",
			company=self.company,
		)

		self.staff = User.objects.create_user(
			email="staff@billingco.test",
			password="secret123",
			username="staff",
			first_name="Staff",
			last_name="User",
			role="STAFF",
			company=self.company,
		)

	def test_staff_cannot_subscribe_plan(self):
		self.client.force_authenticate(self.staff)
		response = self.client.post("/api/payments/subscribe/", {"plan_id": "ENTERPRISE"}, format="json")
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_staff_cannot_cancel_subscription(self):
		self.client.force_authenticate(self.staff)
		response = self.client.post("/api/payments/cancel-subscription/", {}, format="json")
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_staff_cannot_confirm_subscription(self):
		self.client.force_authenticate(self.staff)
		response = self.client.post("/api/payments/confirm/", {"subscription_id": "I-TESTSUBSCRIPTION"}, format="json")
		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
