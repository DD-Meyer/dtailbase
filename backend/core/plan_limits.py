# Plan pricing and limits are edited in the Django admin (Core > Plan configurations).
# DEFAULT_PLAN_CONFIG below only seeds the database and is the fallback when the DB
# is unavailable. Everything in the app reads PLAN_CONFIG, which is DB-backed.
# PayFast bills in ZAR only (international cards are converted by the cardholder's bank).
import threading
import time
from collections.abc import Mapping

BILLING_CURRENCY = 'ZAR'


def currency_for_country(country_code):
    """Billing currency for a country: a PayFast-enabled local currency, else USD."""
    return COUNTRY_CURRENCY.get((country_code or '').upper(), 'USD')


# Currencies enabled on the PayFast account (ZAR is always on).
SUPPORTED_CURRENCIES = [
    ('ZAR', 'South African Rand'), ('USD', 'US Dollar'), ('EUR', 'Euro'),
    ('GBP', 'British Pound Sterling'), ('BWP', 'Botswana Pula'),
    ('AUD', 'Australian Dollar'), ('CAD', 'Canadian Dollar'),
    ('MZN', 'Mozambican Metical'), ('MUR', 'Mauritian Rupee'),
    ('RWF', 'Rwandan Franc'), ('TZS', 'Tanzanian Shilling'),
    ('AED', 'UAE Dirham'), ('AFN', 'Afghan Afghani'), ('ALL', 'Albanian Lek'),
]

_EURO_COUNTRIES = (
    'AT BE HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES AD MC SM VA ME XK'
).split()
COUNTRY_CURRENCY = {
    'ZA': 'ZAR', 'GB': 'GBP', 'AU': 'AUD', 'CA': 'CAD', 'BW': 'BWP', 'MZ': 'MZN',
    'MU': 'MUR', 'RW': 'RWF', 'TZ': 'TZS', 'AE': 'AED', 'AF': 'AFN', 'AL': 'ALL',
    **{code: 'EUR' for code in _EURO_COUNTRIES},
}


DEFAULT_PLAN_CONFIG = {
    'STARTER': {
        'monthly_bookings': 10,
        'max_users': 1,
        'max_images_before': 2,
        'max_images_after': 2,
        'max_image_width': 1280,
        'max_image_height': 720,
        'max_customers': 1000,
        'indemnity_history_limit': 0, # No history saved
        'buffer_timer': False,
        'price': 0,
        'features': [
            '10 Monthly Bookings',
            '1 User Account',
            '2 Before / 2 After Photos (Up to 1280x720)',
            'Basic Digital Waivers',
            'Up to 1,000 Customers',
        ],
    },
    'PRO': {
        'monthly_bookings': 60,
        'max_users': 10,
        'max_images_before': 10,
        'max_images_after': 10,
        'max_image_width': 1920,
        'max_image_height': 1080,
        'max_customers': 5000,
        'indemnity_history_limit': 5,
        'buffer_timer': True,
        'price': 399,
        'features': [
            '60 Monthly Bookings',
            '10 Team Members',
            '10 Before / 10 After HD Condition Captures (1920x1080)',
            'Store up to 5 Templates (1 Active)',
            'Manual template selection per booking',
            'Legally-Binding Asset Vault (Auto-Bound PDFs)',
            'Lightweight High-Speed Bay Architecture',
            'Buffer Timer Enabled',
            'Up to 5,000 Customers',
        ],
    },
    'ENTERPRISE': {
        'monthly_bookings': float('inf'),
        'max_users': 50,
        'max_images_before': 25,
        'max_images_after': 25,
        'max_image_width': 3840,
        'max_image_height': 2160,
        'max_customers': float('inf'), # Unlimited
        'indemnity_history_limit': 20,
        'max_linked_service_templates': 20,
        'storage_limit_gb': 100,
        'buffer_timer': True,
        'price': 999,
        'features': [
            'Unlimited Bookings',
            '50 Team Members',
            '25 Before / 25 After 4K Condition Captures (3840x2160)',
            '20 Smart-Linked Service Templates',
            'Automatically binds the exact liability contract per booked service',
            '100GB Premium Cloud Vault Storage',
            'Enterprise Asset Vault + Forever Booking Sync',
            'Lifetime Legal History',
            'Priority Bay Support',
            'No-Lag Upload Pipeline for High-Res Logs',
            'Unlimited Customers',
        ],
    }
}


_CACHE_TTL_SECONDS = 30
_cache = {'data': None, 'expires': 0.0}
_cache_lock = threading.Lock()


def clear_plan_config_cache():
    with _cache_lock:
        _cache['data'] = None
        _cache['expires'] = 0.0


def _load_plan_config():
    """Defaults overlaid with any rows saved in the admin. Never raises."""
    data = {plan: dict(cfg) for plan, cfg in DEFAULT_PLAN_CONFIG.items()}
    try:
        from core.models import PlanConfiguration
        for row in PlanConfiguration.objects.all():
            data[row.plan] = row.as_config()
    except Exception:
        pass  # table missing (pre-migrate) or DB unavailable: use defaults
    return data


class _PlanConfigMapping(Mapping):
    """Read-only dict-like view of the current plan configuration."""

    def _data(self):
        with _cache_lock:
            if _cache['data'] is None or time.monotonic() >= _cache['expires']:
                _cache['data'] = _load_plan_config()
                _cache['expires'] = time.monotonic() + _CACHE_TTL_SECONDS
            return _cache['data']

    def __getitem__(self, key):
        return self._data()[key]

    def __iter__(self):
        return iter(self._data())

    def __len__(self):
        return len(self._data())


PLAN_CONFIG = _PlanConfigMapping()
