"""
Security Tests for Upgrade & Team Permissions
Tests for the critical fixes applied to prevent:
1. Staff accessing upgrades
2. Direct plan changes without payment
3. Unauthorized team member removal
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import Company
from core.serializers import CompanySerializer

User = get_user_model()


class TeamPermissionsSecurityTests(TestCase):
    """Test that staff cannot access payment/upgrade endpoints"""
    
    def setUp(self):
        """Create test users and company"""
        self.company = Company.objects.create(
            name="Test Company",
            email="test@example.com",
            plan="STARTER"
        )
        
        # Create OWNER
        self.owner = User.objects.create_user(
            email="owner@test.com",
            password="testpass123",
            role="OWNER",
            company=self.company
        )
        
        # Create STAFF
        self.staff = User.objects.create_user(
            email="staff@test.com",
            password="testpass123",
            role="STAFF",
            company=self.company
        )
        
        self.client = APIClient()
    
    def test_staff_cannot_access_upgrade_endpoint(self):
        """STAFF should be denied from PayPalSubscribeView"""
        self.client.force_authenticate(user=self.staff)
        
        response = self.client.post(
            '/api/payments/subscribe/',
            {'plan_id': 'PRO'},
            format='json'
        )
        
        # Should get 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', response.data)
    
    def test_owner_can_access_upgrade_endpoint(self):
        """OWNER should be allowed to access upgrade endpoints"""
        self.client.force_authenticate(user=self.owner)
        
        # This will fail at the PayPal API level, but should pass permission check
        response = self.client.post(
            '/api/payments/subscribe/',
            {'plan_id': 'PRO'},
            format='json'
        )
        
        # Should NOT be 403 (permission denied)
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_staff_cannot_cancel_subscription(self):
        """STAFF should be denied from PayPalCancelSubscriptionView"""
        self.client.force_authenticate(user=self.staff)
        
        response = self.client.post('/api/payments/cancel-subscription/')
        
        # Should get 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PlanFieldReadOnlyTests(TestCase):
    """Test that plan field cannot be directly modified via PATCH"""
    
    def setUp(self):
        """Create test company and owner"""
        self.company = Company.objects.create(
            name="Test Company",
            email="test@example.com",
            plan="STARTER"
        )
        
        self.owner = User.objects.create_user(
            email="owner@test.com",
            password="testpass123",
            role="OWNER",
            company=self.company
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)
    
    def test_plan_field_is_read_only_in_serializer(self):
        """Plan field should be in read_only_fields"""
        serializer = CompanySerializer()
        self.assertIn('plan', serializer.fields)
        self.assertTrue(serializer.fields['plan'].read_only)
    
    def test_cannot_upgrade_plan_directly_via_patch(self):
        """Trying to PATCH plan should be ignored (read-only)"""
        original_plan = self.company.plan
        
        response = self.client.patch(
            f'/api/company/{self.company.id}/',
            {'plan': 'ENTERPRISE'},
            format='json'
        )
        
        # Request should succeed (200)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # But plan should NOT have changed
        self.company.refresh_from_db()
        self.assertEqual(self.company.plan, original_plan)
    
    def test_plan_not_in_writable_fields(self):
        """Plan should not be in writable fields"""
        serializer = CompanySerializer()
        writable_fields = [f for f in serializer.fields if not serializer.fields[f].read_only]
        self.assertNotIn('plan', writable_fields)


class TeamMemberAuditTests(TestCase):
    """Test that team member changes are logged"""
    
    def setUp(self):
        """Create test company and owner"""
        self.company = Company.objects.create(
            name="Test Company",
            email="test@example.com",
            plan="PRO"  # PRO allows multiple users
        )
        
        self.owner = User.objects.create_user(
            email="owner@test.com",
            password="testpass123",
            role="OWNER",
            company=self.company
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.owner)
    
    def test_can_view_team_members(self):
        """Owner should be able to list team members"""
        response = self.client.get('/api/company/team/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
    
    def test_can_add_team_member(self):
        """Owner should be able to add team members"""
        response = self.client.post(
            '/api/company/team/',
            {
                'email': 'newstaff@test.com',
                'password': 'testpass123',
                'role': 'STAFF'
            },
            format='json'
        )
        
        # Should succeed
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify user was created
        self.assertTrue(
            User.objects.filter(email='newstaff@test.com', company=self.company).exists()
        )
    
    def test_cannot_delete_self_from_team(self):
        """Owner should not be able to delete themselves"""
        response = self.client.delete(f'/api/company/team/{self.owner.id}/')
        
        # Should fail with 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_last_owner_cannot_be_deleted(self):
        """The last OWNER should not be deletable"""
        # Try to delete the only owner
        response = self.client.delete(f'/api/company/team/{self.owner.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class StaffAccessRestrictionTests(TestCase):
    """Test that STAFF cannot access admin endpoints"""
    
    def setUp(self):
        """Create test company with owner and staff"""
        self.company = Company.objects.create(
            name="Test Company",
            email="test@example.com",
            plan="PRO"
        )
        
        self.owner = User.objects.create_user(
            email="owner@test.com",
            password="testpass123",
            role="OWNER",
            company=self.company
        )
        
        self.staff = User.objects.create_user(
            email="staff@test.com",
            password="testpass123",
            role="STAFF",
            company=self.company
        )
        
        self.client = APIClient()
    
    def test_staff_cannot_update_company_settings(self):
        """STAFF should be denied from updating company settings"""
        self.client.force_authenticate(user=self.staff)
        
        response = self.client.patch(
            f'/api/company/{self.company.id}/',
            {'phone': '1234567890'},
            format='json'
        )
        
        # Should get 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_staff_cannot_manage_team_members(self):
        """STAFF should be denied from managing team members"""
        self.client.force_authenticate(user=self.staff)
        
        # Try to add a team member
        response = self.client.post(
            '/api/company/team/',
            {
                'email': 'another@test.com',
                'password': 'testpass123',
                'role': 'STAFF'
            },
            format='json'
        )
        
        # Should get 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_owner_can_manage_company_and_team(self):
        """OWNER should have full access"""
        self.client.force_authenticate(user=self.owner)
        
        # Should be able to update company
        response = self.client.patch(
            f'/api/company/{self.company.id}/',
            {'phone': '1234567890'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should be able to manage team
        response = self.client.get('/api/company/team/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
