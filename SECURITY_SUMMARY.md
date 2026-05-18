# DtailBase Security Findings - Quick Reference

## 🚨 CRITICAL VULNERABILITY

**Direct Plan Upgrade Without Payment**

Any OWNER can instantly upgrade to any plan without paying:

```bash
PATCH /api/company/{company_id}/ 
{
  "plan": "ENTERPRISE"
}
```

**Root Cause**: `plan` field is writable in [core/serializers.py CompanySerializer](core/serializers.py#L529-L560)

**Fix**: Add `'plan'` to `read_only_fields` (1-line fix)

---

## 📊 Findings Summary

| # | Issue | Severity | Location | Status |
|---|-------|----------|----------|--------|
| 1 | Writable `plan` field | 🔴 CRITICAL | serializers.py:545 | Unfixed |
| 2 | No plan change validation | 🟠 HIGH | views.py:714 | Unfixed |
| 3 | No audit trail for team changes | 🟡 MEDIUM | Multiple | Unfixed |
| 4 | No ownership transfer endpoint | 🟡 MEDIUM | N/A | N/A |
| 5 | Seat enforcement works well | 🟢 SECURE | models.py:114 | ✅ |
| 6 | PayPal webhook verification | 🟢 SECURE | payments.py:365 | ✅ |

---

## 🎯 Exploitation Steps

```
1. Login as OWNER → get JWT token
2. PATCH /api/company/my-id/ with {"plan": "ENTERPRISE"}
3. Instantly get: 50 team members, unlimited bookings, unlimited features
4. No PayPal payment required ✅
5. No audit trail showing illegitimate upgrade ✅
```

---

## ✅ What Works Well

- **Team member limits enforced** before adding users
- **User deactivation on downgrade** respects role priority (OWNER > STAFF)
- **Last active user protected** from deactivation
- **PayPal webhooks verified** with signature check
- **Booking quotas enforced** per plan limit

---

## 📝 Quick Fixes

### Fix #1: Make plan read-only (5 min)
```python
# backend/core/serializers.py line 545
read_only_fields = [
    'id', 'created_at', 'plan',  # ← ADD THIS
    'requested_country_code', ...
]
```

### Fix #2: Add plan change validation (1 hour)
Add checks in `CompanyViewSet.perform_update()` to ensure plan changes only come from:
- PayPal webhooks (signed)
- Cancel subscription endpoint (user-initiated)

### Fix #3: Add audit logging (2-3 hours)
Create AuditLog model to track:
- Team member additions/removals
- Role changes
- Plan upgrades/downgrades
- User deactivations

---

## 🔍 Key Files to Review

**Vulnerability**:
- [backend/core/serializers.py](backend/core/serializers.py#L529-L570) - CompanySerializer (plan is writable)
- [backend/core/views.py](backend/core/views.py#L662-L730) - CompanyViewSet (no validation)

**Permission Classes**:
- [backend/core/permissions.py](backend/core/permissions.py) - IsAccountAdmin (only checks role)

**Correct Implementation**:
- [backend/accounts/models.py](backend/accounts/models.py#L114-L145) - enforce_plan_limits() ✅
- [backend/payments/views.py](backend/payments/views.py#L365-L550) - PayPalWebhookView ✅

**Team Management**:
- [backend/core/views.py](backend/core/views.py#L760-L800) - CompanyTeamListView (enforces limits ✅)
- [backend/core/serializers.py](backend/core/serializers.py#L390-L500) - UserSerializer (validates deactivation ✅)

---

## 🛡️ Risk Assessment

| Stakeholder | Impact |
|-------------|--------|
| **Revenue** | ❌ CRITICAL - Customers skip payments |
| **Compliance** | ❌ CRITICAL - No audit trail of upgrades |
| **Competition** | ⚠️ HIGH - Small competitors could exploit |
| **User Trust** | ⚠️ HIGH - If discovered, damages credibility |

---

## 📋 Test Case to Verify Vulnerability

```python
def test_owner_can_upgrade_without_payment():
    company = Company.objects.create(name="Test", plan='STARTER')
    owner = User.objects.create(
        email="owner@test.com",
        company=company,
        role='OWNER',
        is_active=True
    )
    
    client.force_authenticate(owner)
    response = client.patch(
        f'/api/company/{company.id}/',
        {'plan': 'ENTERPRISE'},
        format='json'
    )
    
    company.refresh_from_db()
    
    # CURRENT: plan changed to ENTERPRISE ❌ VULNERABLE
    # AFTER FIX: plan stays STARTER ✅ SECURE
    assert company.plan == 'STARTER'
```

---

## 📞 For Developers

**To reproduce**:
1. Create a test user with OWNER role
2. Run the test case above
3. Observe plan field is writeable

**To fix**:
1. Edit [serializers.py](backend/core/serializers.py#L545)
2. Add `'plan'` to `read_only_fields`
3. Run test again - should pass

**To validate**:
- PATCH still works for other fields (name, email, etc.)
- PATCH silently ignores `plan` field (DRF behavior when field is read-only)
- Only PayPal webhooks can change plan now

---

## 🔐 Security Checklist

- [ ] Make `plan` field read-only in CompanySerializer
- [ ] Add validation: plan changes only via webhooks/cancel
- [ ] Add audit logging for team member changes
- [ ] Test that direct plan upgrade is blocked
- [ ] Test that PayPal webhooks still work
- [ ] Review for similar vulnerabilities in other serializers
- [ ] Update API documentation (no more plan editing endpoint)
- [ ] Deploy fix to staging first
- [ ] Monitor logs for unauthorized upgrade attempts

---

See [SECURITY_FINDINGS.md](SECURITY_FINDINGS.md) for complete analysis with code examples.
