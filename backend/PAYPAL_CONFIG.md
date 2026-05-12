# PayPal Integration Configuration Guide

## Environment Variables

Add these environment variables to your `.env` file or deployment environment:

### PayPal Credentials (Get from PayPal Developer Dashboard)
```
PAYPAL_MODE=sandbox  # Use 'live' for production
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_WEBHOOK_URL=https://yourdomain.com/api/payments/webhook/
```

### Geolocation Service (ipstack.com)
```
IPSTACK_API_KEY=your_ipstack_api_key_here
```

### Optional: Cache Backend (for geolocation caching)
If using Django's cache framework, configure in settings.py:

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}
```

## Steps to Get Credentials

### PayPal Credentials:
1. Go to https://developer.paypal.com/dashboard
2. Login or create a PayPal Developer account
3. Create or select your app
4. Copy the Client ID and Client Secret (Signature) from the app settings
5. For subscriptions, ensure you have the Subscriptions API enabled

### ipstack API Key:
1. Visit https://ipstack.com
2. Sign up for a free account
3. Copy your API key from the dashboard
4. Free tier includes 100 requests/month, which is sufficient for testing

## Backend Settings Configuration

Add to your `backend/core/settings.py`:

```python
# PayPal Configuration
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID')
PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET')
PAYPAL_WEBHOOK_URL = os.environ.get('PAYPAL_WEBHOOK_URL')

# Geolocation Service
IPSTACK_API_KEY = os.environ.get('IPSTACK_API_KEY')

# Logging for payments
LOGGING = {
    ...existing logging config...
    'loggers': {
        'payments': {
            'level': 'INFO',
            'handlers': ['console'],
        },
    }
}
```

## Database Migrations

After configuration, run:
```bash
cd backend
python manage.py migrate accounts
```

This applies the new PayPal and geolocation fields to the Company model.

## Testing Locally

### For Development/Testing:
1. Use PayPal Sandbox mode (set PAYPAL_MODE=sandbox)
2. Use test PayPal business and buyer accounts from PayPal Developer Dashboard
3. For ipstack, requests from localhost will return 'US' by default
4. You can manually set `company.country_code` in Django admin to test ZAR pricing

### Payment Flow:
1. User clicks "Upgrade via PayPal" button
2. Frontend fetches pricing from `/payments/pricing/` (detects currency based on IP)
3. Frontend calls `/payments/subscribe/` endpoint
4. Backend creates PayPal subscription and returns approval URL
5. User is redirected to PayPal for approval
6. PayPal redirects back to success URL
7. PayPal sends IPN webhook to `/payments/webhook/`
8. Backend updates company subscription status

## Production Checklist

- [ ] Switch PAYPAL_MODE to 'live'
- [ ] Obtain live PayPal credentials
- [ ] Update PAYPAL_WEBHOOK_URL to production domain
- [ ] Verify IPSTACK_API_KEY is configured
- [ ] Test payment flow end-to-end
- [ ] Set up error alerting for webhook failures
- [ ] Configure HTTPS for webhook endpoint
- [ ] Update payment success/failure page URLs
- [ ] Document refund process for admins
