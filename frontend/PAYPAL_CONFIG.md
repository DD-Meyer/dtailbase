# PayPal React Integration Configuration

## Environment Variables (.env.local)

Create a `.env.local` file in the `frontend/` directory:

```
# PayPal SDK Configuration
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id_here

# API Configuration
VITE_API_URL=http://localhost:8000/api
```

## Getting PayPal Client ID

1. Go to https://developer.paypal.com/dashboard
2. Select your app
3. Copy the **Client ID** (NOT the Client Secret)
4. Paste it into VITE_PAYPAL_CLIENT_ID

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

This installs `@paypal/react-paypal-js` which is required for PayPal Buttons integration.

### 2. Configure Environment
Create `.env.local`:
```
VITE_PAYPAL_CLIENT_ID=YOUR_CLIENT_ID
VITE_API_URL=http://localhost:8000/api
```

### 3. Development Mode
```bash
npm run dev
```

The app will run with PayPal Sandbox mode by default.

## PayPal Integration Components

### App.jsx
- Wraps the app with `PayPalScriptProvider`
- Loads the PayPal JavaScript SDK
- Configures subscription mode and vault settings

### Pages/Upgrade.jsx
- Displays pricing based on detected country/currency
- Fetches pricing from `/payments/pricing/` endpoint
- Uses `PayPalSubscribeButton` for each plan

### Components/PayPalSubscribeButton.jsx
- Handles subscription initiation
- Calls `/payments/subscribe/` backend endpoint
- Redirects to PayPal for user approval
- Shows loading/error states

## Features Implemented

✅ Geolocation-based pricing (ZAR for South Africa, USD elsewhere)
✅ Dynamic currency detection from user IP
✅ PayPal Subscriptions API integration
✅ Sandbox mode for testing
✅ Error handling with user feedback
✅ Loading states
✅ Responsive design

## Testing

### Test Accounts (Sandbox)
- Get test accounts from PayPal Developer Dashboard
- Business Account: Use to receive payments
- Buyer Account: Use to make test payments

### Test Flow
1. Start frontend: `npm run dev`
2. Start backend: `python manage.py runserver`
3. Navigate to Upgrade page
4. Click "Upgrade via PayPal"
5. Use PayPal test buyer account to complete payment
6. Check backend logs for webhook confirmation

### Test Pricing
- From IP outside South Africa: USD pricing
- To test ZAR: Manually set `company.country_code='ZA'` in Django admin

## Production Deployment

### 1. Update PayPal Client ID
```
VITE_PAYPAL_CLIENT_ID=YOUR_LIVE_CLIENT_ID
```

### 2. Update API URL
```
VITE_API_URL=https://api.yourdomain.com/api
```

### 3. Build
```bash
npm run build
```

### 4. Test Before Deployment
- Verify payment success flow
- Verify currency detection
- Check error handling
- Test on mobile browsers

## Troubleshooting

### PayPal Buttons Not Showing
- Verify VITE_PAYPAL_CLIENT_ID is correct
- Check browser console for errors
- Ensure PayPalScriptProvider wraps the component
- Check VITE_API_URL is accessible

### Wrong Currency Displayed
- Check geolocation detection: Open DevTools, check `/payments/pricing/` response
- Verify IPSTACK_API_KEY on backend
- For testing: Manually set country_code in Django admin

### Payment Not Processing
- Check browser console for errors
- Check backend logs: `logs/payments.log`
- Verify PayPal credentials are for correct mode (sandbox/live)
- Check webhook configuration on PayPal dashboard

## Architecture

```
Frontend (React)
    ↓
PayPalScriptProvider (SDK)
    ↓
Upgrade Page
    ↓
PayPalSubscribeButton
    ↓
Backend API
    ├─ /payments/pricing/ (GET)
    ├─ /payments/subscribe/ (POST)
    └─ /payments/webhook/ (POST from PayPal)
    ↓
PayPal
```
