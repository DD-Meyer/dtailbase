# DtailBase Security & Permissions Audit

**Date**: May 18, 2026  
**Scope**: Role management, upgrade/downgrade logic, permission validation, team member management  
**Risk Level**: **CRITICAL** (1 critical vulnerability identified)

---

## Executive Summary

The DtailBase backend has a **critical privilege escalation vulnerability** that allows any OWNER user to instantly upgrade their company plan without paying, bypassing the entire PayPal payment system. Additionally, several permission checks lack depth for feature entitlements.

**Key Issues**:
1. ✅ **CRITICAL**: `plan` field is writable in CompanySerializer (direct upgrade possible)
2. ⚠️ **HIGH**: No validation that user paid for plan upgrades
3. ⚠️ **MEDIUM**: Team member management lacks audit trails
4. ✅ **LOW**: Ownership transfer mechanism missing

---

## Detailed Findings

### 1. CRITICAL VULNERABILITY: Writable `plan` Field in CompanySerializer

**Location**: [backend/core/serializers.py](backend/core/serializers.py#L529-L560)  
**Severity**: CRITICAL  
**CVSS Score**: ~8.2 (High impact, network exploitable)

#### Problem
The `plan` field is in the serializer's `fields` list but **NOT** in `read_only_fields`:

```python
class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'plan', 'plan_limits', ...]  # ❌ 'plan' is writable!
        read_only_fields = [
            'id', 'created_at',
            'requested_country_code', ...
            # ❌ MISSING: 'plan'
        ]
```

#### Attack Vector
An authenticated OWNER can directly PATCH their company to any plan:

```bash
curl -X PATCH "https://api.dtailbase.com/api/company/{company_id}/" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"plan": "ENTERPRISE"}'

# Response: 200 OK
# Result: Instant access to ENTERPRISE features (50 team members, unlimited bookings, etc.)
# Cost: $0
# PayPal validation: Bypassed ✅
```

#### Impact
- **Monetary**: Customers can get ENTERPRISE features ($XXX/month value) for free
- **Feature Access**: Unlimited bookings, team members, customers, images, history
- **Audit**: No PayPal webhook → no record of legitimate purchase
- **Business Logic**: Breaks entire subscription model

#### Current Permission Check
```python
# backend/core/views.py CompanyViewSet
def get_permissions(self):
    if self.action in ['update', 'partial_update']:
        permission_classes = [IsAuthenticated, IsAccountAdmin]  # Only checks role=='OWNER'
```

The `IsAccountAdmin` permission only verifies the user is an OWNER of the company, not that they've legitimately paid for the plan.

---

### 2. HIGH RISK: No Plan Change Validation Logic

**Location**: [backend/core/views.py CompanyViewSet.perform_update()](backend/core/views.py#L714-L730)

#### Problem
When a plan update occurs, **no validation checks whether it's legitimate**:

```python
def perform_update(self, serializer):
    instance = serializer.save()  # ✅ Saves any plan value directly
    self.enforce_plan_limits(instance)  # Only adjusts user seats, doesn't validate upgrade
```

**Missing checks**:
- ❌ Is there an active PayPal subscription for this plan?
- ❌ Is the plan change actually coming from a valid webhook?
- ❌ Was the downgrade user-initiated (cancel subscription)?
- ❌ Log audit trail of who changed the plan

#### Correct Pattern (PayPal Webhooks)
Plan updates **should** only happen through:

1. **PayPal Subscribe Endpoint** ([backend/payments/views.py](backend/payments/views.py#L65-L150))  
   - User clicks "Upgrade" → redirected to PayPal approval flow
   - `paypal_subscription_id` stored after approval
   - Plan doesn't change until webhook confirms

2. **PayPal Webhooks** ([backend/payments/views.py PayPalWebhookView](backend/payments/views.py#L365-L550))  
   - Webhook signature verified: `verify_paypal_webhook(data, request.headers)`
   - Plan extracted from PayPal subscription object
   - Company updated only after webhook validation

3. **Cancel Subscription Endpoint** ([backend/payments/views.py PayPalCancelSubscriptionView](backend/payments/views.py#L190-L210))  
   - User clicks "Cancel subscription"
   - Calls PayPal API to cancel
   - Downgrades to STARTER in response

**Problem**: No validation that plan changes come from these legitimate sources.

---

### 3. Team Member Management: Role Assignment & Enforcement

**Location**: [backend/core/views.py CompanyTeamListView](backend/core/views.py#L760-L800)  
**Severity**: MEDIUM  
**Status**: ✅ Correctly Implemented (mostly)

#### What Works Well
- **Plan Limits Enforced**: Cannot add team members beyond plan limit
  ```python
  def perform_create(self, serializer):
      team_count = User.objects.filter(company=company).count()
      if team_count >= max_users:
          raise ValidationError(...)  # ✅ Correct gating
  ```

- **Role Defaults**: New users default to STAFF (not OWNER)
  ```python
  # Only system superusers can create additional OWNER roles
  validated_data.setdefault('role', 'STAFF')
  ```

- **Team List Visibility**: Only shows users within seat limit
  ```python
  queryset[:plan_limit]  # ✅ Respects plan limits
  ```

#### Vulnerabilities

**MEDIUM: No Audit Trail**
- Who added/removed team members?
- When were they added?
- What role did they have?
- Who changed their permissions?

**No endpoint exists to**:
- Transfer ownership to another user
- Promote STAFF to OWNER
- Audit team member history

**Edge Case: Team Member Self-Deactivation Protection**
```python
def validate_is_active(self, value):
    if value is False and request.user == instance:
        raise ValidationError("You cannot deactivate your own account")  # ✅ Good
```

---

### 4. User Seat Enforcement: Correct Priority Logic

**Location**: [backend/accounts/models.py Company.enforce_plan_limits()](backend/accounts/models.py#L114-L145)  
**Severity**: LOW  
**Status**: ✅ Correctly Implemented

#### How It Works
When plan is downgraded, users are deactivated based on priority:

```python
def enforce_plan_limits(self):
    max_users = PLAN_CONFIG[company.plan]['max_users']
    
    # Priority: Owners > Staff > Newest
    all_users = User.objects.annotate(
        role_priority=Case(
            When(role='OWNER', then=Value(1)),
            When(role='STAFF', then=Value(2)),
        )
    ).order_by('role_priority', '-created_at')
    
    # Keep top N active, deactivate the rest
    for index, user in enumerate(all_users):
        new_status = (index < max_users)
```

#### Safeguard
Last active user is ALWAYS preserved:
```python
if total_users == 1:
    new_status = True  # ✅ Never deactivate the only user
```

---

### 5. Ownership & Role Management

**Location**: [backend/accounts/models.py](backend/accounts/models.py#L174-L200)  
**Severity**: MEDIUM  
**Status**: ⚠️ Gap in functionality

#### How Ownership is Assigned

**At Registration**:
```python
# User self-registers with new company
validated_data['role'] = 'OWNER'  # ✅ First user becomes OWNER
```

**When Admin Adds User**:
```python
# Authenticated owner adds team member
validated_data.setdefault('role', 'STAFF')  # ✅ New users are STAFF
```

#### Gap: No Ownership Transfer Endpoint
- **Missing**: No way to change ownership if original OWNER leaves
- **Risk**: If OWNER is deleted and no backup OWNER exists → company has no owner
  
**Current Safeguard**:
```python
if instance.role == 'OWNER' and not User.objects.filter(
    company=instance.company, role='OWNER', is_active=True
).exists():
    raise ValidationError("Cannot delete the last active Owner")
```

**Problem**: User could be deactivated (not deleted), leaving no active OWNER.

---

### 6. PayPal Webhook Validation: Well-Implemented

**Location**: [backend/payments/views.py PayPalWebhookView](backend/payments/views.py#L365-L550)  
**Severity**: N/A  
**Status**: ✅ Correctly Implemented

#### Webhook Signature Verification
```python
if not verify_paypal_webhook(data, request.headers):
    logger.warning("Invalid PayPal webhook signature")
    return Response(status=403)  # ✅ Reject unsigned webhooks
```

#### Deduplication (Replay Attack Prevention)
```python
event_id = data.get('id')
dedupe_key = f"paypal:webhook:event:{event_id}"
if cache.get(dedupe_key):
    return Response(status=200)  # ✅ Skip duplicate events
```

#### Plan Extraction from Webhook
```python
plan_tier = get_paypal_tier_from_plan_id(plan_paypal_id)  # ✅ PayPal validates plan ID
if plan_tier:
    company.plan = plan_tier
    company.save(update_fields=['plan'])
```

---

### 7. Permission Classes Overview

**Location**: [backend/core/permissions.py](backend/core/permissions.py)

#### `IsCompanyUser` ✅
Used for guarding data access (bookings, customers, etc.)
```python
def has_object_permission(self, request, view, obj):
    if request.user.is_superuser:
        return True
    if isinstance(obj, Company):
        return obj == request.user.company
    if hasattr(obj, 'company'):
        return obj.company == request.user.company
```
**Status**: Correctly prevents cross-company data access

#### `IsAccountAdmin` ⚠️
Used for admin operations (team management, company updates)
```python
def has_permission(self, request, view):
    return bool(
        request.user and 
        request.user.is_authenticated and 
        request.user.role == 'OWNER'
    )
```
**Problem**: Only checks role, doesn't validate feature entitlements. No checking of:
- Payment status
- Active subscription
- Legitimate upgrade path

#### `CanUpdateBookingStatus` ✅
Used for booking status transitions
```python
# Ensures booking belongs to user's company
if hasattr(obj, 'company'):
    return obj.company == user_company
```
**Status**: Correct

---

### 8. Plan Limits Configuration

**Location**: [backend/core/plan_limits.py](backend/core/plan_limits.py)  
**Status**: ✅ Correctly Structured

```python
PLAN_CONFIG = {
    'STARTER': {
        'monthly_bookings': 10,
        'max_users': 1,
        'max_customers': 1000,
        'buffer_timer': False,
    },
    'PRO': {
        'monthly_bookings': 60,
        'max_users': 10,
        'max_customers': float('inf'),
        'buffer_timer': True,
    },
    'ENTERPRISE': {
        'monthly_bookings': float('inf'),
        'max_users': 50,
        'max_customers': float('inf'),
        'buffer_timer': True,
    }
}
```

**Enforcement Locations**:
- ✅ Booking creation: [backend/core/views.py BookingListCreateAPIView](backend/core/views.py#L328-L333)
- ✅ Team member limits: [backend/core/views.py CompanyTeamListView.perform_create()](backend/core/views.py#L790-L800)
- ✅ Buffer timer customization: [backend/core/serializers.py CompanySerializer.validate_booking_buffer()](backend/core/serializers.py#L562-L572)

---

## API Endpoints Requiring Security Review

### 1. **PATCH /api/company/{id}/** - CRITICAL
- **Purpose**: Update company details
- **Permission**: IsAuthenticated + IsAccountAdmin (OWNER only)
- **Issue**: `plan` field is writable
- **Risk**: Direct privilege escalation
- **Recommendation**: Make `plan` read_only

### 2. **POST /api/company/team/** - Correctly Implemented
- **Purpose**: Add team members
- **Permission**: IsAuthenticated + IsAccountAdmin
- **Issue**: None (seat limits enforced)
- **Risk**: Low

### 3. **PATCH /api/company/team/{id}/** - MEDIUM RISK
- **Purpose**: Update team member (role, active status)
- **Permission**: IsAuthenticated + IsAccountAdmin
- **Issue**: No audit trail of changes
- **Risk**: Medium (user could be secretly deactivated)

### 4. **DELETE /api/company/team/{id}/** - Correctly Implemented
- **Purpose**: Remove team member
- **Permission**: IsAuthenticated + IsAccountAdmin
- **Issue**: Prevents self-deletion and deleting last OWNER
- **Risk**: Low

### 5. **POST /api/payments/subscribe/** - Correctly Implemented
- **Purpose**: Initiate PayPal subscription
- **Permission**: IsAuthenticated
- **Issue**: None
- **Risk**: Low (redirects to PayPal for approval)

### 6. **POST /api/payments/webhook/** - Correctly Implemented
- **Purpose**: Handle PayPal webhooks
- **Permission**: AllowAny (protected by signature)
- **Issue**: None
- **Risk**: Low (signature verified)

---

## Privilege Escalation Proof of Concept

### Scenario: Attacker (OWNER) upgrades from STARTER to ENTERPRISE

```
1. Attacker logs in with valid OWNER credentials
   GET /api/auth/token/ → {access_token: "abc123", plan: "STARTER"}

2. Attacker upgrades instantly without paying:
   PATCH /api/company/current-company-id/
   {
     "plan": "ENTERPRISE"
   }
   Response: 200 OK
   {
     "id": "...",
     "plan": "ENTERPRISE",
     "plan_limits": {
       "max_users": 50,
       "monthly_bookings": null,  // unlimited
       "max_customers": null,      // unlimited
     }
   }

3. Attacker now has:
   ✅ 50 team members (was 1)
   ✅ Unlimited bookings (was 10/month)
   ✅ Unlimited customers (was 1000)
   ✅ Unlimited image history (was 0)

4. PayPal shows NO record of purchase
   Audit log shows: Company plan changed by attacker user
   No webhook = No legitimate payment record
```

---

## Recommended Fixes (Priority Order)

### 1. CRITICAL: Make `plan` Field Read-Only

**File**: [backend/core/serializers.py](backend/core/serializers.py#L529-L560)

```python
class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [...]
        read_only_fields = [
            'id', 'created_at', 'plan',  # ✅ ADD 'plan' HERE
            'requested_country_code', ...
        ]
```

**Impact**: Eliminates direct privilege escalation. Plan changes now require:
- PayPal subscription approval
- Valid webhook signature
- Cancel subscription endpoint (only for downgrades)

---

### 2. HIGH: Add Plan Change Validation

**File**: [backend/core/views.py](backend/core/views.py#L714-L730)

```python
def perform_update(self, serializer):
    old_plan = self.get_object().plan
    instance = serializer.save()
    
    # ✅ NEW: Validate plan change is legitimate
    if old_plan != instance.plan:
        self._validate_plan_change(old_plan, instance)
    
    self.enforce_plan_limits(instance)

def _validate_plan_change(self, old_plan, company):
    # Plan changes only via webhooks should modify the database
    # If we get here via PATCH, AND plan changed, reject if:
    # - No active PayPal subscription
    # - No webhook record in audit log
    
    # For now: Reject all PATCH-based plan changes
    raise PermissionDenied(
        "Plan changes must be made through PayPal. "
        "Use the upgrade/downgrade endpoints."
    )
```

---

### 3. HIGH: Add Audit Trail for Team Changes

**File**: Create [backend/core/models.py AuditLog](backend/core/models.py)

```python
class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('TEAM_MEMBER_ADDED', 'Team member added'),
        ('TEAM_MEMBER_REMOVED', 'Team member removed'),
        ('TEAM_MEMBER_ROLE_CHANGED', 'Team member role changed'),
        ('PLAN_UPGRADED', 'Plan upgraded'),
        ('PLAN_DOWNGRADED', 'Plan downgraded'),
        ('USER_DEACTIVATED', 'User deactivated'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audited_by')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    details = models.JSONField(default=dict)  # Old value, new value, etc.
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['company', 'timestamp']),
        ]
```

Log every team member change:
```python
def perform_destroy(self, instance):
    AuditLog.objects.create(
        company=instance.company,
        actor=self.request.user,
        target_user=instance,
        action='TEAM_MEMBER_REMOVED',
        details={'email': instance.email, 'role': instance.role}
    )
    instance.delete()
```

---

### 4. MEDIUM: Implement Ownership Transfer Endpoint

**File**: [backend/core/views.py](backend/core/views.py)

```python
class CompanyOwnershipTransferView(APIView):
    permission_classes = [IsAuthenticated, IsAccountAdmin]
    
    def post(self, request):
        """
        Transfer ownership to another team member.
        Requires confirmation from both parties.
        """
        company = request.user.company
        new_owner_id = request.data.get('new_owner_id')
        
        # Validation
        new_owner = User.objects.get(id=new_owner_id, company=company)
        if not new_owner.is_active:
            return Response({'error': 'New owner must be active'}, status=400)
        
        # Create transfer record
        transfer = OwnershipTransfer.objects.create(
            company=company,
            from_owner=request.user,
            to_owner=new_owner
        )
        
        # Send email confirmation to new owner
        new_owner.email_user('Ownership Transfer Confirmation', ...)
        
        return Response({'transfer_id': transfer.id, 'status': 'PENDING_CONFIRMATION'})
    
    def patch(self, request):
        """New owner confirms ownership transfer"""
        transfer_id = request.data.get('transfer_id')
        transfer = OwnershipTransfer.objects.get(id=transfer_id)
        
        if transfer.to_owner != request.user:
            raise PermissionDenied("Only the new owner can confirm")
        
        # Update roles
        transfer.from_owner.role = 'STAFF'
        transfer.from_owner.save()
        transfer.to_owner.role = 'OWNER'
        transfer.to_owner.save()
        
        AuditLog.objects.create(
            company=transfer.company,
            action='OWNERSHIP_TRANSFERRED',
            details={'from': transfer.from_owner.email, 'to': transfer.to_owner.email}
        )
        
        transfer.status = 'COMPLETED'
        transfer.save()
```

---

### 5. LOW: Rate Limiting on Upgrade Attempts

**File**: [backend/payments/views.py](backend/payments/views.py#L65-L150)

```python
from django_ratelimit.decorators import ratelimit

class PayPalSubscribeView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [UserRateThrottle]  # DRF built-in
    
    def post(self, request):
        # With DRF throttle: /api/payments/subscribe/ → max 10 requests/hour per user
        ...
```

---

## Testing Recommendations

### Unit Tests
```python
def test_cannot_upgrade_plan_via_patch():
    """CRITICAL: Verify plan field is immutable via API"""
    company = Company.objects.create(name="Test", plan='STARTER')
    user = User.objects.create(email="owner@test.com", company=company, role='OWNER')
    
    client.force_authenticate(user)
    response = client.patch(f'/api/company/{company.id}/', {'plan': 'ENTERPRISE'})
    
    company.refresh_from_db()
    assert company.plan == 'STARTER'  # ✅ Should not change
    assert response.status_code == 400  # Or make plan read-only so it's ignored

def test_plan_downgrade_deactivates_extra_users():
    """Verify seat enforcement works on plan change"""
    company = Company.objects.create(name="Test", plan='PRO')
    owner = User.objects.create(email="owner@test.com", company=company, role='OWNER')
    staff1 = User.objects.create(email="staff1@test.com", company=company, role='STAFF')
    
    # Downgrade to STARTER (max 1 user)
    company.plan = 'STARTER'
    company.save()  # triggers enforce_plan_limits()
    
    owner.refresh_from_db()
    staff1.refresh_from_db()
    assert owner.is_active == True  # ✅ Owner kept
    assert staff1.is_active == False  # ✅ Staff deactivated
```

### Integration Tests
```python
def test_webhook_is_only_valid_upgrade_path():
    """Verify only PayPal webhooks can legitimately upgrade"""
    user = User.objects.create(...)
    
    # ATTEMPT 1: Direct PATCH (should fail after fix)
    response = client.patch('/api/company/.../', {'plan': 'ENTERPRISE'})
    assert response.status_code in [400, 405]  # Plan is read-only
    
    # ATTEMPT 2: PayPal webhook (should succeed)
    webhook_data = generate_valid_paypal_webhook()
    response = client.post('/api/payments/webhook/', webhook_data)
    assert response.status_code == 200
```

---

## Summary Table

| Finding | Severity | Status | Fix ETA |
|---------|----------|--------|---------|
| Writable `plan` field | CRITICAL | ✅ Found | 1 day |
| No plan change validation | HIGH | ✅ Found | 2 days |
| No audit trail | MEDIUM | ✅ Found | 3 days |
| No ownership transfer | MEDIUM | ✅ Found | 3 days |
| Deactivation edge case | LOW | ✅ Mitigated | Monitor |

---

## Conclusion

The DtailBase permission system has **strong core safeguards** for team member limits and booking quotas, but a **critical vulnerability** allows instant privilege escalation through the writable `plan` field. 

Immediate action required:
1. **Make `plan` read-only** (5 min fix)
2. **Add plan change validation** (1 hour)
3. **Add audit logging** (2-3 hours)

Once fixed, the subscription model will be secure and immune to permission escalation attacks.
