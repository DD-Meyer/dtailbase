# PayPal Integration - Quick Start (5 minutes)

## TL;DR - Get Running Fast

### 1️⃣ Get Credentials (5 min)
- PayPal: https://developer.paypal.com → Copy sandbox Client ID & Secret
- ipstack: https://ipstack.com → Copy API Key

### 2️⃣ Backend Setup (3 min)
```bash
cd backend

# Copy env template
cp .env.example .env

# Edit .env with your credentials
# PAYPAL_CLIENT_ID=your_id
# PAYPAL_CLIENT_SECRET=your_secret
# IPSTACK_API_KEY=your_key

# Install PayPal SDK
pip install paypalrestsdk==1.7.1

# Run migrations
python manage.py migrate accounts
```

### 3️⃣ Frontend Setup (3 min)
```bash
cd frontend

# Copy env template
cp .env.example .env.local

# Edit .env.local
# VITE_PAYPAL_CLIENT_ID=your_id

# Install deps
npm install
```

### 4️⃣ Test It (2 min)
```bash
# Terminal 1: Backend
python manage.py runserver

# Terminal 2: Frontend  
npm run dev
```

Navigate to http://localhost:5173 → Log in → Go to Upgrade page → See pricing in correct currency!

---

## Test Payment Flow

1. Click "Upgrade via PayPal"
2. Redirected to PayPal sandbox
3. Use PayPal test buyer account
4. Complete payment
5. Check backend: Company.plan should be updated to PRO/ENTERPRISE

---

## Common Issues

**"Buttons not showing"**
- Check VITE_PAYPAL_CLIENT_ID in .env.local
- Check browser console for errors

**"Wrong currency"**
- Check IPSTACK_API_KEY is set
- Verify `/api/payments/pricing/` returns correct country_code

**"Payment not processing"**
- Check Django logs
- Verify PAYPAL_CLIENT_ID and SECRET are correct

---

## That's It! 🎉

For detailed setup: See `PAYPAL_INTEGRATION_GUIDE.md`
For troubleshooting: See `PAYPAL_INTEGRATION_GUIDE.md` → Troubleshooting
For production: See `PAYPAL_INTEGRATION_GUIDE.md` → Production Deployment

---

## Architecture (30 sec overview)

```
Frontend              Backend            PayPal
├─ Upgrade.jsx   →   /pricing/       →  Detect IP
└─ Click Upgrade →   /subscribe/     →  Create subscription
                   ←  (approval URL)  
                            ↓ User approves
                     /webhook/        ← IPN callback
                     Update company
```

---

## Files To Know

**Backend:**
- `backend/payments/paypal_service.py` - PayPal integration
- `backend/payments/geolocation.py` - Country detection
- `backend/payments/views.py` - API endpoints

**Frontend:**
- `frontend/src/pages/Upgrade.jsx` - Pricing page
- `frontend/src/components/PayPalSubscribeButton.jsx` - PayPal buttons

**Config:**
- `.env` (backend) - Credentials
- `.env.local` (frontend) - PayPal Client ID

---

## Production Checklist

- [ ] Get live PayPal credentials
- [ ] Update PAYPAL_MODE=live
- [ ] Configure webhook in PayPal dashboard
- [ ] Build frontend: `npm run build`
- [ ] Deploy both backend & frontend
- [ ] Test real payment
- [ ] Set up monitoring
- [ ] Document for support team

---

## Money Flows 💰

**User in South Africa:**
```
Click Upgrade → Detects ZA → Shows R499 PRO → Pays in ZAR ✓
```

**User in USA:**
```
Click Upgrade → Detects US → Shows $29 PRO → Pays in USD ✓
```

**Admin Override (if needed):**
```
Django Admin → Company → Set country_code='ZA' → ZAR pricing ✓
```

---

Done! Your PayPal integration is ready. 🚀
