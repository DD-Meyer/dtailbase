# PayFast Subscriptions

PayFast handles all subscription billing. Customers are charged in their company currency (ZAR or USD).

## Environment (`backend/.env`)
| Variable | Purpose |
|---|---|
| `PAYFAST_MODE` | `sandbox` or `live` – selects the credential set |
| `PAYFAST_SANDBOX_MERCHANT_ID/KEY/PASSPHRASE` | Sandbox credentials |
| `PAYFAST_LIVE_MERCHANT_ID/KEY/PASSPHRASE` | Live credentials |
| `PAYFAST_NOTIFY_URL` | Public HTTPS URL of `/api/payments/payfast/notify/` (ITN). Defaults to `PUBLIC_BASE_URL` + path |
| `PAYFAST_SKIP_IP_CHECK` | Sandbox only: skip ITN source-IP check (e.g. behind a tunnel) |

**Pricing and plan limits are edited in Django admin → Core → Plan configurations** (price in ZAR, limits, features; changes apply within ~30 seconds, or immediately after saving on the same process). `backend/core/plan_limits.py` only holds the seed defaults/fallback and `BILLING_CURRENCY`. PayFast bills in ZAR only; international cards are converted by the cardholder's bank.

Restart the backend after changing `.env`.

## Endpoints (`/api/payments/`)
- `subscribe/` – returns a signed checkout (`approval_url`) and, with `mode=onsite`, an `onsite_uuid` for the in-page modal. Paid-to-paid downgrades update the recurring amount instead.
- `payfast/notify/` – ITN: verifies signature, source IP, merchant and server-side validation, then activates, upgrades or cancels the plan.
- `confirm/` – return-page status check (state is driven by the ITN).
- `cancel-subscription/` – cancels; access continues to the paid period end.
- `billing-summary/` – plan, currency, status and next billing date.

## Local testing
PayFast must reach the notify URL, so expose the backend with a tunnel (e.g. ngrok) and set `PAYFAST_NOTIFY_URL`.
