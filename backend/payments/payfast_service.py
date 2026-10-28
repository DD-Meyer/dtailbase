"""
PayFast subscription integration (South African Rand billing).

- Checkout: signed redirect to PayFast's hosted payment page (subscription_type=1).
- Notifications: ITN (Instant Transaction Notification) validated by signature,
  source IP, server-side confirmation and amount check.
- Management: PayFast REST API (fetch / update / cancel subscription by token).
"""

import hashlib
import logging
import socket
import time
from decimal import Decimal, InvalidOperation
from urllib.parse import quote_plus, urlencode

import requests
from django.conf import settings

from core.plan_limits import BILLING_CURRENCY, PLAN_CONFIG

logger = logging.getLogger(__name__)

PROCESS_URL = {
    'sandbox': 'https://sandbox.payfast.co.za/eng/process',
    'live': 'https://www.payfast.co.za/eng/process',
}
VALIDATE_URL = {
    'sandbox': 'https://sandbox.payfast.co.za/eng/query/validate',
    'live': 'https://www.payfast.co.za/eng/query/validate',
}
API_BASE = 'https://api.payfast.co.za'

VALID_HOSTS = ('www.payfast.co.za', 'sandbox.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za')

# Field order matters for the checkout signature (PayFast documentation order).
CHECKOUT_FIELD_ORDER = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'name_first', 'name_last', 'email_address', 'cell_number',
    'm_payment_id', 'amount', 'item_name', 'item_description',
    'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
    'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
    'email_confirmation', 'confirmation_address', 'payment_method',
    'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles',
        'currency',
    ]

PLAN_NAMES = {
    'PRO': 'Dtailbase Professional',
    'ENTERPRISE': 'Dtailbase Enterprise',
}


def get_mode():
    mode = (getattr(settings, 'PAYFAST_MODE', 'sandbox') or 'sandbox').lower()
    return 'live' if mode == 'live' else 'sandbox'


def get_credentials():
    """Return (merchant_id, merchant_key, passphrase) for the active mode."""
    mode = get_mode()
    prefix = 'PAYFAST_LIVE_' if mode == 'live' else 'PAYFAST_SANDBOX_'
    return (
        getattr(settings, prefix + 'MERCHANT_ID', ''),
        getattr(settings, prefix + 'MERCHANT_KEY', ''),
        getattr(settings, prefix + 'PASSPHRASE', ''),
    )


def is_configured():
    merchant_id, merchant_key, _ = get_credentials()
    return bool(merchant_id and merchant_key)


def _paid_plans():
    return [(plan, cfg) for plan, cfg in PLAN_CONFIG.items() if plan != 'STARTER']


def normalize_currency(currency=None):
    """The currency to bill in: the requested one if the admin has priced it, else ZAR."""
    code = (currency or '').upper()
    if code and code != BILLING_CURRENCY and any(
        (cfg.get('prices') or {}).get(code) for _, cfg in _paid_plans()
    ):
        return code
    return BILLING_CURRENCY


def get_pricing(currency=None):
    """Monthly price per paid plan in `currency`, from the admin-managed PLAN_CONFIG."""
    code = normalize_currency(currency)
    pricing = {}
    for plan, cfg in _paid_plans():
        raw = cfg.get('price') if code == BILLING_CURRENCY else (cfg.get('prices') or {}).get(code)
        if raw:
            pricing[plan] = Decimal(str(raw)).quantize(Decimal('0.01'))
    return pricing


def get_plan_amount(plan_id, currency=None):
    return get_pricing(currency).get(plan_id)


def get_plan_for_amount(amount, currency=None):
    """Map a recurring amount back to a plan tier."""
    try:
        value = Decimal(str(amount)).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError):
        return None
    for plan, price in get_pricing(currency).items():
        if price == value:
            return plan
    return None


def _encode(value):
    return quote_plus(str(value).strip())


def generate_signature(data, passphrase='', ordered_keys=None):
    """MD5 signature over url-encoded name=value pairs (+ passphrase)."""
    keys = ordered_keys if ordered_keys is not None else list(data.keys())
    parts = [f"{k}={_encode(data[k])}" for k in keys if k in data and str(data[k]).strip() != '']
    payload = '&'.join(parts)
    if passphrase:
        payload += f"&passphrase={_encode(passphrase)}"
    return hashlib.md5(payload.encode()).hexdigest()


def build_checkout_pairs(*, email, plan_id, m_payment_id, return_url, cancel_url, notify_url,
                         name_first='', name_last='', company_id='', currency='ZAR'):
    """Signed, ordered (key, value) pairs for a monthly subscription checkout."""
    merchant_id, merchant_key, passphrase = get_credentials()
    currency = normalize_currency(currency)
    amount = get_plan_amount(plan_id, currency)
    if not (merchant_id and merchant_key) or amount is None:
        return []

    fields = {
        'merchant_id': merchant_id,
        'merchant_key': merchant_key,
        'return_url': return_url,
        'cancel_url': cancel_url,
        'notify_url': notify_url,
        'name_first': name_first,
        'name_last': name_last,
        'email_address': email,
        'm_payment_id': m_payment_id,
        'amount': f"{amount:.2f}",
        'item_name': PLAN_NAMES.get(plan_id, 'Dtailbase Subscription'),
        'item_description': f"Dtailbase {plan_id.title()} monthly subscription",
        'custom_str1': plan_id,
        'custom_str2': str(company_id),
        'custom_str3': currency,
        'subscription_type': '1',
        'recurring_amount': f"{amount:.2f}",
        'frequency': '3',  # monthly
        'cycles': '0',  # indefinite
    }
    if currency != BILLING_CURRENCY:
        fields['currency'] = currency
    fields = {k: v for k, v in fields.items() if str(v).strip() != ''}
    ordered = [k for k in CHECKOUT_FIELD_ORDER if k in fields]
    fields['signature'] = generate_signature(fields, passphrase, ordered)
    ordered.append('signature')
    return [(k, fields[k]) for k in ordered]


def build_checkout_url(**kwargs):
    """Signed PayFast hosted-page (redirect) URL."""
    pairs = build_checkout_pairs(**kwargs)
    return f"{PROCESS_URL[get_mode()]}?{urlencode(pairs)}" if pairs else None


ONSITE_PROCESS_URL = {
    'sandbox': 'https://sandbox.payfast.co.za/onsite/process',
    'live': 'https://www.payfast.co.za/onsite/process',
}
ONSITE_ENGINE_URL = {
    'sandbox': 'https://sandbox.payfast.co.za/onsite/engine.js',
    'live': 'https://www.payfast.co.za/onsite/engine.js',
}


def get_onsite_uuid(**kwargs):
    """Register the payment with PayFast and return the onsite payment UUID (or None)."""
    pairs = build_checkout_pairs(**kwargs)
    if not pairs:
        return None
    try:
        response = requests.post(ONSITE_PROCESS_URL[get_mode()], data=pairs, timeout=15)
        uuid_value = (response.json() or {}).get('uuid') if response.ok else None
        if not uuid_value:
            logger.error(f"PayFast onsite registration failed: {response.status_code} {response.text[:300]}")
        return uuid_value
    except (requests.RequestException, ValueError) as exc:
        logger.error(f"PayFast onsite registration error: {exc}")
        return None


# ── ITN validation ──────────────────────────────────────────────────────────

def verify_itn_signature(post_items):
    """post_items: ordered list of (key, value) exactly as PayFast posted them."""
    _, _, passphrase = get_credentials()
    received = ''
    parts = []
    for key, value in post_items:
        if key == 'signature':
            received = value
            continue
        parts.append(f"{key}={_encode(value)}")
    payload = '&'.join(parts)
    if passphrase:
        payload += f"&passphrase={_encode(passphrase)}"
    expected = hashlib.md5(payload.encode()).hexdigest()
    return bool(received) and received.lower() == expected


def verify_itn_source(remote_ip):
    """The ITN must originate from a PayFast host."""
    if get_mode() == 'sandbox' and getattr(settings, 'PAYFAST_SKIP_IP_CHECK', False):
        return True
    valid_ips = set()
    for host in VALID_HOSTS:
        try:
            valid_ips.update(socket.gethostbyname_ex(host)[2])
        except socket.gaierror:
            continue
    return remote_ip in valid_ips


def verify_itn_with_server(post_items):
    """Ask PayFast to confirm the ITN payload is genuine."""
    body = urlencode(post_items)
    try:
        response = requests.post(VALIDATE_URL[get_mode()], data=body,
                                 headers={'Content-Type': 'application/x-www-form-urlencoded'}, timeout=10)
        return response.text.strip() == 'VALID'
    except requests.RequestException as exc:
        logger.error(f"PayFast server validation failed: {exc}")
        return False


def amounts_match(expected, received):
    try:
        return abs(Decimal(str(expected)) - Decimal(str(received))) <= Decimal('0.01')
    except (InvalidOperation, TypeError):
        return False


# ── REST API (subscription management) ──────────────────────────────────────

def _api_request(method, path, body=None):
    merchant_id, _, passphrase = get_credentials()
    if not merchant_id:
        return None
    body = body or {}
    headers = {
        'merchant-id': merchant_id,
        'version': 'v1',
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
    }
    sig_data = {**headers, **{k: str(v) for k, v in body.items()}}
    if passphrase:
        sig_data['passphrase'] = passphrase
    payload = '&'.join(f"{k}={_encode(sig_data[k])}" for k in sorted(sig_data))
    headers['signature'] = hashlib.md5(payload.encode()).hexdigest()

    url = f"{API_BASE}{path}"
    if get_mode() == 'sandbox':
        url += '?testing=true'
    try:
        response = requests.request(method, url, headers=headers, data=body or None, timeout=15)
        try:
            payload_json = response.json()
        except ValueError:
            payload_json = {}
        return {'http_status': response.status_code, 'json': payload_json}
    except requests.RequestException as exc:
        logger.error(f"PayFast API {method} {path} failed: {exc}")
        return None


def get_subscription_details(token):
    """Return the PayFast subscription dict (status, run_date, amount...) or None."""
    result = _api_request('GET', f"/subscriptions/{token}/fetch")
    if not result or result['http_status'] != 200:
        return None
    return (result['json'].get('data') or {}).get('response')


def cancel_subscription(token):
    result = _api_request('PUT', f"/subscriptions/{token}/cancel")
    if result and result['http_status'] == 200:
        return {'success': True}
    # Already cancelled counts as success.
    if result and result['http_status'] == 400 and 'cancel' in str(result['json']).lower():
        return {'success': True}
    return {'success': False, 'error': 'Failed to cancel PayFast subscription'}


def update_subscription_amount(token, amount):
    """Change the recurring amount from the next billing run."""
    cents = int((Decimal(str(amount)) * 100).quantize(Decimal('1')))
    result = _api_request('PATCH', f"/subscriptions/{token}/update", {'amount': cents})
    if result and result['http_status'] == 200:
        return {'success': True}
    return {'success': False, 'error': 'Failed to update PayFast subscription'}
