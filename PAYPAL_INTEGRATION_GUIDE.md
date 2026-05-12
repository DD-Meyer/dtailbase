# PayPal Subscriptions Integration - Complete Setup Guide

## Overview

This document guides you through integrating PayPal subscriptions with geolocation-based pricing (ZAR for South Africa, USD elsewhere).

### Key Features
- ✅ PayPal Subscriptions API (recurring billing)
- ✅ Geolocation-based currency detection (ipstack.com)
- ✅ Dynamic pricing in ZAR or USD
- ✅ Automatic subscription management
- ✅ Webhook handling for payment updates
- ✅ Admin override for manual currency selection

---

## Backend Setup

### 1. Install PayPal SDK

Add to `backend/requirements.txt`:
```
paypalrestsdk==1.7.1
```

Install:
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create or update `.env` file in backend root:

```
# PayPal Configuration
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_PAYPAL_CLIENT_SECRET
PAYPAL_WEBHOOK_URL=https://yourdomain.com/api/payments/webhook/

# Geolocation Service
IPSTACK_API_KEY=YOUR_IPSTACK_API_KEY

# Optional
PUBLIC_BASE_URL=https://yourdomain.com
```

### 3. Update Django Settings

Add to `backend/core/settings.py`:

```python
import os

# PayPal Configuration
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET', '')
PAYPAL_WEBHOOK_URL = os.environ.get('PAYPAL_WEBHOOK_URL', '')

# Geolocation Service
IPSTACK_API_KEY = os.environ.get('IPSTACK_API_KEY', '')

# Cache Configuration (for geolocation caching)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
```

### 4. Run Migrations

```bash
python manage.py migrate accounts
```

This creates the new fields:
- `paypal_subscription_id`
- `paypal_customer_id`
- `country_code`
- `currency`

### 5. Update API URLs

Ensure `backend/payments/urls.py` has the correct routes:

```python
from django.urls import path
from .views import (
    PayPalSubscribeView, 
    PayPalWebhookView, 
    PricingView,
    PayFastCheckoutView  # Deprecated
)

urlpatterns = [
    path('pricing/', PricingView.as_view(), name='pricing'),
    path('subscribe/', PayPalSubscribeView.as_view(), name='paypal_subscribe'),
    path('webhook/', PayPalWebhookView.as_view(), name='paypal_webhook'),
    path('payfast-initiate/', PayFastCheckoutView.as_view(), name='payfast_initiate'),  # Deprecated
]
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This installs `@paypal/react-paypal-js` along with other dependencies.

### 2. Configure Environment

Create `.env.local` in `frontend/` directory:

```
VITE_PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID
VITE_API_URL=http://localhost:8000/api
```

For production:
```
VITE_PAYPAL_CLIENT_ID=YOUR_LIVE_PAYPAL_CLIENT_ID
VITE_API_URL=https://api.yourdomain.com/api
```

### 3. Verify Updates

Check these files are updated:
- ✅ `frontend/src/App.jsx` - Wrapped with PayPalScriptProvider
- ✅ `frontend/src/pages/Upgrade.jsx` - Uses PayPal buttons with dynamic pricing
- ✅ `frontend/src/components/PayPalSubscribeButton.jsx` - New component
- ✅ `frontend/src/styles/PayPalSubscribeButton.css` - New styles
- ✅ `frontend/package.json` - Contains @paypal/react-paypal-js

### 4. Start Development Server

```bash
npm run dev
```

---

## Testing

### Prerequisites
1. PayPal Developer Account (https://developer.paypal.com)
2. ipstack Account (https://ipstack.com)
3. Test PayPal Business and Buyer accounts

### Test Credentials

**PayPal Test Accounts** (from Developer Dashboard):
- Business Account: Used to receive test payments
- Buyer Account: Used to make test payments

**ipstack API Key**: Get from https://ipstack.com/dashboard

### Local Testing Flow

1. **Start Backend**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Pricing Detection**
   - Open browser to http://localhost:5173
   - Log in
   - Go to Settings → Upgrade
   - Check that currency displays correctly (should detect based on your IP)
   - Currency info shown: "Pricing displayed in: USD" or "South African Rand (ZAR)"

4. **Test Subscription Flow**
   - Click "Upgrade via PayPal" on PRO or ENTERPRISE plan
   - Should redirect to PayPal sandbox
   - Use test buyer account to complete payment
   - Should redirect back to success page
   - Check backend logs for webhook confirmation

5. **Test Manual Currency Override** (Admin)
   - Go to Django admin: http://localhost:8000/admin
   - Find company in Company list
   - Change `country_code` to 'ZA'
   - Save
   - Refresh pricing page - should now show ZAR prices

### Testing Different Currencies

**Option 1: VPN/Proxy**
- Connect to VPN in South Africa to test ZAR pricing
- Connect to VPN elsewhere to test USD pricing

**Option 2: Manual Override (Admin)**
- Set company.country_code = 'ZA' in Django admin
- Refresh page to see ZAR pricing

**Option 3: API Testing**
- Call `/api/payments/pricing/` endpoint directly
- Response will show detected currency and pricing

### Webhook Testing

PayPal may not send webhooks in sandbox mode reliably. To test locally:

1. Use ngrok or similar tunneling service:
   ```bash
   ngrok http 8000
   ```

2. Update PAYPAL_WEBHOOK_URL in .env:
   ```
   PAYPAL_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/payments/webhook/
   ```

3. Configure in PayPal Developer Dashboard:
   - Go to App Settings
   - Configure Webhook URL
   - Select events: Subscription events

---

## Pricing Configuration

Pricing is defined in `backend/payments/paypal_service.py`:

```python
PRICING = {
    'ZAR': {
        'PRO': {'amount': '499.00', 'currency': 'ZAR'},
        'ENTERPRISE': {'amount': '1299.00', 'currency': 'ZAR'}
    },
    'USD': {
        'PRO': {'amount': '29.00', 'currency': 'USD'},
        'ENTERPRISE': {'amount': '149.00', 'currency': 'USD'}
    }
}
```

To update pricing, edit this dictionary and redeploy.

---

## Deployment to Production

### 1. PayPal Live Credentials

Get live credentials from PayPal Developer Dashboard:
- Log in with business account
- Go to Live keys section
- Copy Live Client ID and Secret

### 2. Update Environment Variables

```
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=YOUR_LIVE_CLIENT_ID
PAYPAL_CLIENT_SECRET=YOUR_LIVE_CLIENT_SECRET
PAYPAL_WEBHOOK_URL=https://yourdomain.com/api/payments/webhook/
```

### 3. Frontend Build

```bash
cd frontend
npm run build
```

Deploy `dist/` folder to your hosting.

### 4. Backend Deployment

- Ensure all env variables are set in production
- Run migrations
- Configure HTTPS for webhook endpoint
- Update CORS settings to allow frontend domain

### 5. Configure PayPal Webhooks (Production)

1. Log in to PayPal Business Account
2. Go to Account Settings → Webhooks
3. Add webhook endpoint:
   - URL: https://yourdomain.com/api/payments/webhook/
   - Select events: All subscription events
4. Test webhook with PayPal tools

### 6. Pre-Launch Checklist

- [ ] Test payment flow end-to-end
- [ ] Verify subscription activation after payment
- [ ] Test subscription cancellation flow
- [ ] Verify currency detection works globally
- [ ] Test error scenarios (declined card, etc.)
- [ ] Configure email notifications
- [ ] Set up monitoring/alerting
- [ ] Document refund process for support team
- [ ] Test on mobile browsers
- [ ] Verify HTTPS everywhere
- [ ] Set up SSL certificate

---

## Troubleshooting

### PayPal SDK Not Loading
**Error**: Buttons not showing on upgrade page

**Solution**:
- Check browser console for errors
- Verify VITE_PAYPAL_CLIENT_ID is correct
- Check that App.jsx properly wraps with PayPalScriptProvider

### Wrong Currency Displayed
**Error**: Shows USD instead of ZAR (or vice versa)

**Solution**:
- Verify IPSTACK_API_KEY is set on backend
- Check `/api/payments/pricing/` response for correct country_code
- For testing: Manually set company.country_code in Django admin

### Subscription Not Activating
**Error**: Payment completes but plan doesn't upgrade

**Solution**:
- Check backend logs for webhook processing errors
- Verify PAYPAL_WEBHOOK_URL is correctly configured
- Check that webhook endpoint is accessible
- Verify webhook events are enabled in PayPal dashboard

### API Connection Errors
**Error**: 401, 403, or connection timeout

**Solution**:
- Verify PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are correct
- Check PAYPAL_MODE matches your account (sandbox vs live)
- Ensure backend can reach PayPal API servers

### Database Migration Issues
**Error**: Migration fails or columns not created

**Solution**:
```bash
python manage.py migrate accounts --verbose
```

If rollback needed:
```bash
python manage.py migrate accounts 0011
```

---

## Support & Resources

- PayPal Developer Docs: https://developer.paypal.com/docs
- ipstack API Docs: https://ipstack.com/documentation
- Django REST Framework: https://www.django-rest-framework.org
- React PayPal Library: https://github.com/paypal/paypal-checkout-components

---

## Files Modified/Created

### Backend
- `backend/payments/paypal_service.py` ✨ NEW
- `backend/payments/geolocation.py` ✨ NEW
- `backend/payments/views.py` - Updated
- `backend/payments/urls.py` - Updated
- `backend/accounts/models.py` - Updated
- `backend/accounts/migrations/0012_paypal_subscription_fields.py` ✨ NEW
- `backend/requirements.txt` - Updated
- `backend/PAYPAL_CONFIG.md` ✨ NEW

### Frontend
- `frontend/src/App.jsx` - Updated
- `frontend/src/pages/Upgrade.jsx` - Updated
- `frontend/src/components/PayPalSubscribeButton.jsx` ✨ NEW
- `frontend/src/styles/PayPalSubscribeButton.css` ✨ NEW
- `frontend/package.json` - Updated
- `frontend/PAYPAL_CONFIG.md` ✨ NEW

---

## Next Steps

1. ✅ Set up PayPal Developer credentials
2. ✅ Set up ipstack API key
3. ✅ Configure environment variables
4. ✅ Run database migrations
5. ✅ Test locally in sandbox mode
6. ✅ Deploy to staging
7. ✅ Get live credentials
8. ✅ Deploy to production
9. ✅ Monitor webhook processing
10. ✅ Gather user feedback

