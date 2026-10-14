from datetime import time
from io import BytesIO
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.response import Response
from rest_framework.test import APIClient, APITestCase

from accounts.models import Company, User
from core.models import Booking, Customer, Service, Vehicle, VehiclePhoto
from indemnity.models import IndemnityAgreement, IndemnityTemplate


def photo(name="photo.png"):
    buffer = BytesIO()
    Image.new("RGB", (8, 8), "white").save(buffer, "PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class JobStatusTests(APITestCase):
    def setUp(self):
        self.media = TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.settings_override = override_settings(MEDIA_ROOT=self.media.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        notifications = patch("core.views.BookingStatusUpdateView._send_status_update_notifications")
        notifications.start()
        self.addCleanup(notifications.stop)
        pdf = patch("core.serializers.generate_agreement_pdf")
        pdf.start()
        self.addCleanup(pdf.stop)
        self.company = Company.objects.create(name="Test Studio", email="jobs@example.test", plan="STARTER")
        self.user = User(username="job-owner", email="owner@example.test", role="OWNER", company=self.company)
        self.user.set_unusable_password()
        self.user.save()
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.customer = Customer.objects.create(company=self.company, firstname="Maya", lastname="Bennett")
        self.vehicle = Vehicle.objects.create(customer=self.customer, make="BMW", model="M3", registration="TEST01", year=2022)
        self.service = Service.objects.create(company=self.company, name="Detail", duration_minutes=60, base_price="95.00")
        self.booking = Booking.objects.create(
            company=self.company, customer=self.customer, vehicle=self.vehicle, service=self.service,
            booking_date="2026-10-14", booking_time=time(9), booking_end_time=time(10), status="PENDING",
        )
        self.template = IndemnityTemplate.objects.create(company=self.company, title="Agreement", body_html="<p>Terms</p>", version=1)

    def set_status(self, status):
        self.booking.status = status
        self.booking.save()

    def sign(self, before=True, signature=True):
        agreement = IndemnityAgreement.objects.create(
            company=self.company, booking=self.booking, customer=self.customer, template=self.template,
            signature_image=photo("signature.png") if signature else None,
        )
        if before:
            VehiclePhoto.objects.create(agreement=agreement, image=photo("before.png"), photo_type="BEFORE")
        return agreement

    def update(self, status, **fields) -> Response:
        result = self.api.patch(
            f"/api/bookings/{self.booking.pk}/update_status/", {"status": status, **fields}, format="multipart",
        )
        assert isinstance(result, Response)
        return result

    def test_full_progression_and_authoritative_timestamps(self):
        self.assertEqual(self.update("CONFIRMED", expected_status="PENDING").status_code, 200)
        self.assertEqual(self.update("IN_PROGRESS", expected_status="CONFIRMED").status_code, 400)
        self.sign()
        self.assertEqual(self.update("IN_PROGRESS", expected_status="CONFIRMED").status_code, 200)
        self.booking.refresh_from_db()
        self.assertIsNotNone(self.booking.started_at)
        started = self.booking.started_at
        self.assertEqual(self.update("COMPLETED", uploaded_images=[photo("after.png")], expected_status="IN_PROGRESS").status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "COMPLETED")
        self.assertEqual(self.booking.started_at, started)
        completed = self.booking.completed_at
        self.assertIsNotNone(completed)
        self.assertEqual(VehiclePhoto.objects.filter(agreement__booking=self.booking, photo_type="AFTER").count(), 1)
        self.assertEqual(self.update("COMPLETED").status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.completed_at, completed)

    def test_detail_readiness_matches_status_and_prerequisites(self):
        url = f"/api/bookings/{self.booking.pk}/"
        for status in ("PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"):
            self.set_status(status)
            response = self.api.get(url)
            assert isinstance(response, Response)
            self.assertEqual(response.status_code, 200)
            assert response.data is not None
            self.assertIs(response.data["can_start"], False)
        self.set_status("CONFIRMED")
        agreement = self.sign(before=False)
        response = self.api.get(url)
        assert isinstance(response, Response)
        assert response.data is not None
        self.assertIs(response.data["can_start"], False)
        VehiclePhoto.objects.create(agreement=agreement, image=photo(), photo_type="BEFORE")
        for status in ("PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"):
            self.set_status(status)
            response = self.api.get(url)
            assert isinstance(response, Response)
            assert response.data is not None
            self.assertIs(response.data["can_start"], status == "CONFIRMED")
        self.set_status("CONFIRMED")
        IndemnityAgreement.objects.filter(pk=agreement.pk).update(signature_image="")
        response = self.api.get(url)
        assert isinstance(response, Response)
        assert response.data is not None
        self.assertIs(response.data["can_start"], False)

    def test_disallowed_transitions_and_terminal_states(self):
        for current, target in (
            ("PENDING", "IN_PROGRESS"), ("PENDING", "COMPLETED"), ("CONFIRMED", "PENDING"),
            ("CONFIRMED", "COMPLETED"), ("IN_PROGRESS", "CANCELLED"),
            ("COMPLETED", "CONFIRMED"), ("CANCELLED", "CONFIRMED"),
        ):
            with self.subTest(current=current, target=target):
                self.set_status(current)
                self.assertEqual(self.update(target).status_code, 400)
                self.booking.refresh_from_db()
                self.assertEqual(self.booking.status, current)

    @patch("indemnity.serializers.generate_agreement_pdf")
    @patch("indemnity.serializers.Nominatim")
    def test_signing_route_still_starts_confirmed_job(self, geocoder, pdf):
        geocoder.return_value.reverse.return_value.address = "Fictional test location"
        self.set_status("CONFIRMED")
        response = self.api.post("/api/indemnity/sign/", {
            "booking": str(self.booking.pk), "template": str(self.template.pk),
            "signature_image": photo("signature.png"), "uploaded_images": [photo("before.png")],
            "latitude": "-26.1", "longitude": "28.0",
        }, format="multipart")
        assert isinstance(response, Response)
        self.assertEqual(response.status_code, 201)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "IN_PROGRESS")
        self.assertIsNotNone(self.booking.started_at)
        self.assertTrue(IndemnityAgreement.objects.filter(booking=self.booking).exists())
        pdf.assert_called_once()

    def test_stale_and_duplicate_requests_cannot_advance_job(self):
        self.assertEqual(self.update("CONFIRMED", expected_status="PENDING").status_code, 200)
        self.assertEqual(self.update("CANCELLED", expected_status="PENDING").status_code, 400)
        self.assertEqual(self.update("CONFIRMED", expected_status="PENDING").status_code, 400)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "CONFIRMED")

    def test_start_requires_before_photo_and_signature(self):
        self.set_status("CONFIRMED")
        agreement = self.sign(before=False)
        self.assertEqual(self.update("IN_PROGRESS").status_code, 400)
        VehiclePhoto.objects.create(agreement=agreement, image=photo(), photo_type="BEFORE")
        IndemnityAgreement.objects.filter(pk=agreement.pk).update(signature_image="")
        self.assertEqual(self.update("IN_PROGRESS").status_code, 400)
        self.booking.refresh_from_db()
        self.assertIsNone(self.booking.started_at)

    def test_completion_requires_after_photo_and_agreement(self):
        self.set_status("IN_PROGRESS")
        self.assertEqual(self.update("COMPLETED").status_code, 400)
        self.assertEqual(self.update("COMPLETED", uploaded_images=[photo()]).status_code, 400)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "IN_PROGRESS")
        self.assertIsNone(self.booking.completed_at)

    def test_plan_photo_limit_and_invalid_images(self):
        self.set_status("IN_PROGRESS")
        self.sign()
        self.assertEqual(self.update("COMPLETED", uploaded_images=[photo(f"{i}.png") for i in range(3)]).status_code, 400)
        invalid = SimpleUploadedFile("bad.png", b"not-an-image", content_type="image/png")
        self.assertEqual(self.update("COMPLETED", uploaded_images=[invalid]).status_code, 400)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "IN_PROGRESS")

    def test_general_update_cannot_bypass_transition_or_photo_requirements(self):
        url = f"/api/bookings/{self.booking.pk}/"
        response = self.api.patch(url, {"status": "IN_PROGRESS"}, format="json")
        assert isinstance(response, Response)
        self.assertEqual(response.status_code, 400)
        self.set_status("IN_PROGRESS")
        self.sign()
        response = self.api.patch(url, {"status": "COMPLETED"}, format="json")
        assert isinstance(response, Response)
        self.assertEqual(response.status_code, 400)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "IN_PROGRESS")

    def test_readiness_is_boolean_bounded_and_private(self):
        self.set_status("CONFIRMED")
        self.sign()
        response = self.api.get("/api/dashboard/", {"today": "2026-10-14"})
        assert isinstance(response, Response) and isinstance(response.data, dict)
        item = response.data["agenda"]["items"][0]
        self.assertIs(item["can_start"], True)
        self.assertIn("started_at", item)
        for private in ("signature_image", "admin_signature", "indemnity_data", "customer_address"):
            self.assertNotIn(private, item)
        response = self.api.get("/api/bookings/")
        assert isinstance(response, Response) and isinstance(response.data, list)
        self.assertIs(response.data[0]["can_start"], True)

    def test_company_permissions_and_unauthenticated_mutations(self):
        other = Company.objects.create(name="Other", email="other@example.test")
        self.booking.company = other
        self.booking.save()
        self.assertEqual(self.update("CONFIRMED").status_code, 403)
        self.api.force_authenticate(None)
        self.assertIn(self.update("CONFIRMED").status_code, (401, 403))
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "PENDING")

    def test_cancel_has_timestamp_and_cannot_be_reopened(self):
        self.assertEqual(self.update("CANCELLED", expected_status="PENDING").status_code, 200)
        self.booking.refresh_from_db()
        self.assertIsNotNone(self.booking.cancelled_at)
        self.assertEqual(self.update("CONFIRMED").status_code, 400)
