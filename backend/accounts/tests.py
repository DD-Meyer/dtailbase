from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework.response import Response
from core.serializers import UserSerializer
from .models import Company, User, UserManager


class EmailIdentityTests(TestCase):
    users: UserManager

    def setUp(self):
        self.company = Company.objects.create(name="Email identity QA", plan="ENTERPRISE")
        manager = User.objects
        assert isinstance(manager, UserManager)
        self.users = manager
        self.user = self.users.create_user(
            email="owner@demo.example", password="Test-Password-482!",
            username="email-owner", company=self.company, role="OWNER",
        )
        self.api_client = APIClient()

    def login(self, email, password="Test-Password-482!"):
        return self.post_json("/api/token/", {"email": email, "password": password})

    def post_json(self, url, data):
        response = self.api_client.post(url, data, format="json")
        assert isinstance(response, Response)
        return response

    def test_sign_in_ignores_email_case_and_surrounding_spaces(self):
        for email in ("owner@demo.example", "Owner@Demo.Example", " OWNER@DEMO.EXAMPLE "):
            with self.subTest(email=email):
                response = self.login(email)
                self.assertEqual(response.status_code, 200)
                data = response.data
                assert isinstance(data, dict)
                self.assertIn("access", data)
                self.assertEqual(data["user"]["email"], self.user.email)

    def test_legacy_mixed_case_email_can_sign_in(self):
        User.objects.filter(pk=self.user.pk).update(email="Legacy.Owner@Demo.Example")
        self.assertEqual(self.login("legacy.owner@demo.example").status_code, 200)
        self.assertEqual(self.login("LEGACY.OWNER@DEMO.EXAMPLE").status_code, 200)

    def test_wrong_password_unknown_and_inactive_still_fail(self):
        self.assertEqual(self.login("OWNER@DEMO.EXAMPLE", "Wrong-Password!").status_code, 401)
        self.assertEqual(self.login("missing@demo.example").status_code, 401)
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.assertEqual(self.login("OWNER@DEMO.EXAMPLE").status_code, 401)

    def test_manager_normalizes_new_email(self):
        user = self.users.create_user(
            email=" New.Staff@Demo.Example ", password="Test-Password-482!",
            username="new-staff", company=self.company, role="STAFF",
        )
        self.assertEqual(user.email, "new.staff@demo.example")

    def test_registration_rejects_case_variant_of_existing_email(self):
        User.objects.filter(pk=self.user.pk).update(email="Owner@Demo.Example")
        serializer = UserSerializer(data={
            "email": "OWNER@DEMO.EXAMPLE", "username": "duplicate",
            "password": "Test-Password-482!", "first_name": "QA",
            "last_name": "Duplicate", "company_name": "Duplicate company", "role": "OWNER",
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)

    def test_team_creation_normalizes_email_and_rejects_case_duplicate(self):
        self.api_client.force_authenticate(user=self.user)
        payload = {
            "email": "New.Staff@Demo.Example", "username": "new-staff",
            "password": "Test-Password-482!", "first_name": "New",
            "last_name": "Staff", "role": "STAFF",
        }
        response = self.post_json("/api/company/team/", payload)
        self.assertEqual(response.status_code, 201, response.data)
        data = response.data
        assert isinstance(data, dict)
        self.assertEqual(data["email"], "new.staff@demo.example")
        payload["email"] = "NEW.STAFF@DEMO.EXAMPLE"
        duplicate = self.post_json("/api/company/team/", payload)
        self.assertEqual(duplicate.status_code, 400)
        errors = duplicate.data
        assert isinstance(errors, dict)
        self.assertIn("email", errors)

    def test_email_update_cannot_take_another_accounts_case_variant(self):
        self.users.create_user(
            email="staff@demo.example", username="staff", company=self.company, role="STAFF",
        )
        serializer = UserSerializer(self.user, data={"email": "STAFF@DEMO.EXAMPLE"}, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)

    def test_update_accepts_own_email_and_normalizes_new_email(self):
        serializer = UserSerializer(self.user, data={"email": "OWNER@DEMO.EXAMPLE"}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "owner@demo.example")
        serializer = UserSerializer(self.user, data={"email": "New.Owner@Demo.Example"}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "new.owner@demo.example")

    def test_ambiguous_legacy_accounts_fail_without_selecting_a_user(self):
        User.objects.create(
            email="OWNER@DEMO.EXAMPLE", username="legacy-duplicate",
            company=self.company, role="STAFF", password=self.user.password,
        )
        with self.assertLogs("accounts.models", level="ERROR"):
            response = self.login("Owner@Demo.Example")
        self.assertEqual(response.status_code, 401)
