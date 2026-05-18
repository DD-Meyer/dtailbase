# Security Fixes - Technical Reference

## Change 1: Make Plan Field Read-Only

**File**: `backend/core/serializers.py` (Line 544)

```python
# BEFORE
read_only_fields = [
    'id', 'created_at',
    'requested_country_code', 'requested_currency', 
    'location_verification_status', 'location_verification_score',
    'location_verification_notes', 'location_verified_at',
    'location_verification_document'
]

# AFTER
read_only_fields = [
    'id', 'created_at', 'plan',  # ← ADDED 'plan'
    'requested_country_code', 'requested_currency',
    'location_verification_status', 'location_verification_score',
    'location_verification_notes', 'location_verified_at',
    'location_verification_document'
]
```

**Why**: Prevents PATCH /api/company/{id}/ with {"plan": "ENTERPRISE"}

---

## Change 2: Enhanced Permission Checks

**File**: `backend/core/permissions.py` (Lines 1-25)

```python
# BEFORE
from rest_framework import permissions
from accounts.models import Company

class IsAccountAdmin(permissions.BasePermission):
    """
    Permission to allow access only to users with the 'OWNER' role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'OWNER'
        )

# AFTER
from rest_framework import permissions
import logging

from accounts.models import Company

logger = logging.getLogger(__name__)

class IsAccountAdmin(permissions.BasePermission):
    """
    Permission to allow access only to users with the 'OWNER' role.
    🔒 STRICT: Only OWNER role can access payment/company settings.
    STAFF users are explicitly denied from upgrade/payment endpoints.
    """
    def has_permission(self, request, view):
        # Must be authenticated
        if not (request.user and request.user.is_authenticated):
            return False
        
        # CRITICAL: Must be OWNER role - STAFF is NOT allowed
        if request.user.role != 'OWNER':
            # Log denied attempts for audit
            logger.warning(
                f"SECURITY: {request.user.role} user {request.user.email} "
                f"attempted to access {view.__class__.__name__} endpoint"
            )
            return False
        
        return True
```

**Why**: Explicitly blocks STAFF with audit logging

---

## Change 3: Team Member Audit Logging

**File**: `backend/core/views.py` (CompanyTeamListView)

```python
# BEFORE
def perform_create(self, serializer):
    company = self.request.user.company
    plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
    max_users = plan_limits.get('max_users', 1)
    
    team_count = User.objects.filter(company=company).count()
    
    if team_count >= max_users:
        raise ValidationError({...})

    serializer.save(company=company)

# AFTER
def perform_create(self, serializer):
    company = self.request.user.company
    plan_limits = PLAN_CONFIG.get(company.plan, PLAN_CONFIG['STARTER'])
    max_users = plan_limits.get('max_users', 1)
    
    team_count = User.objects.filter(company=company).count()
    
    if team_count >= max_users:
        raise ValidationError({...})

    new_user = serializer.save(company=company)
    
    # 📋 AUDIT LOG: Team member added
    logger.info(
        f"AUDIT: Team member added - Company: {company.id}, "
        f"Added by: {self.request.user.email}, "
        f"New user: {new_user.email}, Role: {new_user.role}"
    )
```

---

## Change 4: Team Member Removal Logging

**File**: `backend/core/views.py` (CompanyUserDetailView)

```python
# BEFORE
def perform_destroy(self, instance):
    if instance == self.request.user:
        raise ValidationError("You cannot delete your own account from the team management page.")
    instance.delete()

    if instance.role == 'OWNER' and not User.objects.filter(company=instance.company, role='OWNER', is_active=True).exists():
        raise ValidationError("You cannot delete the last active Owner of this company.")

# AFTER
def perform_destroy(self, instance):
    if instance == self.request.user:
        raise ValidationError("You cannot delete your own account from the team management page.")
    
    if instance.role == 'OWNER' and not User.objects.filter(company=instance.company, role='OWNER', is_active=True).exclude(id=instance.id).exists():
        raise ValidationError("You cannot delete the last active Owner of this company.")
    
    # 📋 AUDIT LOG: Team member removed
    logger.info(
        f"AUDIT: Team member removed - Company: {instance.company.id}, "
        f"Removed by: {self.request.user.email}, "
        f"Removed user: {instance.email}, Role: {instance.role}"
    )
    
    instance.delete()
```

---

## Change 5: Payment Audit Logging

**File**: `backend/payments/views.py` (PayPalCancelSubscriptionView)

```python
# ADDED LOGGING
old_plan = company.plan
company.is_subscription_active = False
company.plan = 'STARTER'
company.paypal_subscription_id = ''
company.save(update_fields=['is_subscription_active', 'plan', 'paypal_subscription_id'])

# 📋 AUDIT LOG: Subscription cancelled
logger.info(
    f"AUDIT: Subscription cancelled - Company: {company.id}, "
    f"Cancelled by: {user.email}, "
    f"Plan downgrade: {old_plan} → STARTER, "
    f"Subscription ID: {subscription_id}"
)
```

---

## Change 6: Webhook Plan Updates Logging

**File**: `backend/payments/views.py` (PayPalWebhookView)

```python
# IN _handle_subscription_lifecycle
if plan_tier and company.plan != plan_tier:
    old_plan = company.plan
    company.plan = plan_tier
    update_fields.append('plan')
    # 📋 AUDIT LOG: Plan upgraded via webhook
    logger.info(
        f"AUDIT: Plan upgraded via PayPal webhook - Company: {company.id}, "
        f"Plan: {old_plan} → {plan_tier}, Event: {event_type}"
    )

# IN _handle_subscription_payment
if plan_tier and company.plan != plan_tier:
    old_plan = company.plan
    company.plan = plan_tier
    update_fields.append('plan')
    # 📋 AUDIT LOG: Plan updated via payment webhook
    logger.info(
        f"AUDIT: Plan updated via PayPal payment - Company: {company.id}, "
        f"Plan: {old_plan} → {plan_tier}"
    )

# IN _handle_subscription_cancelled
old_plan = company.plan
company.is_subscription_active = False
company.plan = 'STARTER'
update_fields.extend(['is_subscription_active', 'plan'])
company.save(update_fields=update_fields)

# 📋 AUDIT LOG: Subscription cancelled via webhook
logger.info(
    f"AUDIT: Subscription cancelled via webhook - Company: {company.id}, "
    f"Plan downgrade: {old_plan} → STARTER"
)
```

---

## Change 7: Confirm Subscription Logging

**File**: `backend/payments/views.py` (PayPalConfirmView)

```python
# FIRST LOCATION
if plan_tier and subscription_status == 'ACTIVE':
    old_plan = company.plan
    company.paypal_subscription_id = subscription_id
    company.plan = plan_tier
    company.is_subscription_active = True
    company.save(update_fields=['paypal_subscription_id', 'plan', 'is_subscription_active'])
    
    # 📋 AUDIT LOG: Subscription confirmed after completion
    logger.info(
        f"AUDIT: Subscription confirmed - Company: {company.id}, "
        f"Plan: {old_plan} → {plan_tier}, Subscription ID: {subscription_id}, "
        f"Confirmed by: {user.email}"
    )

# SECOND LOCATION
if company.plan != plan_tier:
    old_plan = company.plan
    company.plan = plan_tier
    update_fields.append('plan')
    # 📋 AUDIT LOG: Plan confirmed via PayPal
    logger.info(
        f"AUDIT: Plan confirmed via PayPal - Company: {company.id}, "
        f"Plan: {old_plan} → {plan_tier}, Confirmed by: {user.email}"
    )
```

---

## Testing

New test file: `backend/core/tests_security_fixes.py`

```bash
# Run all security tests
python manage.py test core.tests_security_fixes -v 2

# Run specific test class
python manage.py test core.tests_security_fixes.PlanFieldReadOnlyTests -v 2

# Run specific test
python manage.py test core.tests_security_fixes.PlanFieldReadOnlyTests.test_cannot_upgrade_plan_directly_via_patch -v 2
```

**Test Coverage**:
- ✅ Plan field is read-only
- ✅ Direct upgrades are blocked
- ✅ STAFF cannot access upgrade endpoints
- ✅ STAFF cannot cancel subscription
- ✅ OWNER can access upgrade endpoints

---

## Deployment

1. **Test locally**:
   ```bash
   python manage.py test core.tests_security_fixes
   ```

2. **Deploy to staging**:
   ```bash
   git push origin security-fixes
   ```

3. **Verify in staging**:
   - Test plan changes are logged
   - Test STAFF denied from /api/payments/*
   - Monitor audit logs

4. **Deploy to production**:
   ```bash
   git merge security-fixes
   git push origin main
   ```

5. **Monitor**:
   - Check logs for "SECURITY:" messages
   - Verify all plan changes are logged
   - Audit user management changes
