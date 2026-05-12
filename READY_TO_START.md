# PayPal Integration - Ready to Start!

## ✅ Setup Complete

All credentials configured and database migrated!

```
Frontend:    frontend/.env.local        ✅
Backend:     backend/.env               ✅
Database:    Migration 0012 applied     ✅
```

## 🚀 Start Development

### Terminal 1: Start Backend
```bash
cd backend
python manage.py runserver
```

Expected output:
```
Starting development server at http://127.0.0.1:8000/
```

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v7.2.4  ready in 234 ms
➜  Local:   http://localhost:5173/
```

## 📱 Test the Integration

1. Open http://localhost:5173 in browser
2. Log in with your account
3. Navigate to **Upgrade** page (or click the upgrade button in settings)
4. You should see pricing in the correct currency
5. Click "Upgrade via PayPal" to test the payment flow

## ✅ What to Expect

### Pricing Display
- **If detected outside South Africa**: Pricing shown in USD
  - PRO: $29/month
  - ENTERPRISE: $149/month

- **If detected in South Africa**: Pricing shown in ZAR
  - PRO: R499/month
  - ENTERPRISE: R1299/month

### Currency Detection
- Auto-detected from IP using ipstack
- Shows: "💱 Pricing displayed in: US Dollars (USD)" or "South African Rand (ZAR)"

### Payment Flow
1. Click "Upgrade via PayPal"
2. Redirected to PayPal sandbox login
3. Use PayPal test buyer account to approve
4. Redirected back to success page

## 🔍 Testing Tips

### Test Different Currencies
**Option 1: Use Django Admin**
- Go to http://localhost:8000/admin
- Find your Company
- Change `country_code` to 'ZA' or 'US'
- Save and refresh pricing page

**Option 2: Check API Response**
```bash
curl http://localhost:8000/api/payments/pricing/
```

Response shows your detected country and pricing.

## 🛠️ Debugging

### Check Backend Logs
- All payment operations logged to console
- Look for "Created PayPal plan" or "Created PayPal subscription"

### Check Frontend Console
- Open DevTools (F12)
- Look for network requests to `/api/payments/`
- Check response data for pricing

### Common Issues

**"Buttons not showing"**
- Check browser console for errors
- Verify VITE_PAYPAL_CLIENT_ID in frontend/.env.local

**"API Error"**
- Check backend is running on port 8000
- Verify VITE_API_URL in frontend/.env.local

**"Wrong currency"**
- Check IPSTACK_API_KEY in backend/.env
- Try manual override in Django admin

## 📊 Pricing Configuration

Current pricing in `backend/payments/paypal_service.py`:

```python
PRICING = {
    'ZAR': {
        'PRO': '499.00',      # South Africa
        'ENTERPRISE': '1299.00'
    },
    'USD': {
        'PRO': '29.00',       # Rest of World
        'ENTERPRISE': '149.00'
    }
}
```

To update pricing, edit this dictionary and restart backend.

## 📚 Documentation

- `QUICK_START.md` - Quick reference
- `PAYPAL_INTEGRATION_GUIDE.md` - Complete setup guide
- `PAYPAL_IMPLEMENTATION_SUMMARY.md` - What's implemented
- `backend/PAYPAL_CONFIG.md` - Backend config details
- `frontend/PAYPAL_CONFIG.md` - Frontend config details

## 🎯 Next Steps

1. Start both development servers
2. Test pricing display
3. Test payment flow with PayPal sandbox
4. Check Django admin for company updates after payment
5. Review logs for any issues

## 📞 Support

If issues occur:
1. Check terminal for error messages
2. Review browser console (F12)
3. Check `.env` files have all credentials
4. Verify services are running on correct ports
5. See troubleshooting in `PAYPAL_INTEGRATION_GUIDE.md`

---

**Status**: All systems ready! 🚀
