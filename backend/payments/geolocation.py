"""
Geolocation service to detect user country from IP address.
Uses ipstack.com API for IP geolocation.
"""

import requests
import logging
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

IPSTACK_API_KEY = getattr(settings, 'IPSTACK_API_KEY', '')
IPSTACK_URL = 'http://api.ipstack.com'
CACHE_TIMEOUT = 86400 * 30  # Cache for 30 days


def get_geoip_data(ip_address):
    """
    Return raw ipstack geo payload for an IP (cached).
    Returns an empty dict when unavailable.
    """

    if ip_address in ('127.0.0.1', '::1', 'localhost'):
        return {'country_code': 'US'}

    cache_key = f'geoip_data_{ip_address}'
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    if not IPSTACK_API_KEY:
        logger.warning("IPSTACK_API_KEY not configured in settings")
        cache.set(cache_key, {}, CACHE_TIMEOUT)
        return {}

    try:
        response = requests.get(
            f'{IPSTACK_URL}/{ip_address}',
            params={'access_key': IPSTACK_API_KEY},
            timeout=5
        )
        response.raise_for_status()

        data = response.json()
        if 'error' in data:
            logger.warning(f"ipstack error for IP {ip_address}: {data['error']}")
            cache.set(cache_key, {}, CACHE_TIMEOUT)
            return {}

        cache.set(cache_key, data, CACHE_TIMEOUT)
        return data
    except requests.RequestException as e:
        logger.error(f"Failed to fetch geolocation for IP {ip_address}: {str(e)}")
        cache.set(cache_key, {}, CACHE_TIMEOUT)
        return {}
    except Exception as e:
        logger.error(f"Unexpected error in get_geoip_data: {str(e)}")
        cache.set(cache_key, {}, CACHE_TIMEOUT)
        return {}


def get_country_from_ip(ip_address):
    """
    Detect country code from IP address using ipstack.com.
    Returns country code (e.g., 'ZA', 'US') or 'US' as default.
    """
    
    data = get_geoip_data(ip_address)
    country_code = (data.get('country_code') or 'US').upper()
    logger.info(f"Country for IP {ip_address}: {country_code}")
    return country_code


def get_client_ip(request):
    """
    Extract client IP from request, handling proxies and load balancers.
    """
    # Prefer well-known proxy/CDN headers before generic forwarded headers.
    for header in [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_TRUE_CLIENT_IP',
        'HTTP_X_REAL_IP',
    ]:
        value = request.META.get(header)
        if value:
            return value.strip()

    # Try X-Forwarded-For first (for proxies/load balancers)
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs, use the first one
        ip = x_forwarded_for.split(',')[0].strip()
        return ip
    
    # Fallback to REMOTE_ADDR
    return request.META.get('REMOTE_ADDR', '127.0.0.1')


def detect_user_currency(request):
    """
    Detect user's currency based on IP geolocation.
    Returns tuple: (country_code, currency)
    """
    ip = get_client_ip(request)
    country_code = get_country_from_ip(ip)

    # Fallback hints from client when IP geolocation is unavailable or ambiguous.
    locale_hint = (request.headers.get('X-User-Locale') or request.headers.get('Accept-Language') or '').upper()
    timezone_hint = (request.headers.get('X-User-Timezone') or '').upper()

    if country_code == 'US':
        if '-ZA' in locale_hint or timezone_hint == 'AFRICA/JOHANNESBURG':
            country_code = 'ZA'
    
    # Map country code to currency
    if country_code == 'ZA':
        currency = 'ZAR'
    else:
        currency = 'USD'
    
    return country_code, currency


def detect_pricing_context(request):
    """
    Return pricing context used to determine discount eligibility.
    Discount is only available for South Africa when no VPN/proxy is detected.
    """
    ip = get_client_ip(request)
    geo_data = get_geoip_data(ip)
    country_code = (geo_data.get('country_code') or 'US').upper()
    currency = 'ZAR' if country_code == 'ZA' else 'USD'

    security = geo_data.get('security') if isinstance(geo_data.get('security'), dict) else {}
    connection = geo_data.get('connection') if isinstance(geo_data.get('connection'), dict) else {}
    connection_type = (connection.get('type') or '').lower()

    header_vpn_flag = str(request.headers.get('X-Vpn-Detected', '')).strip().lower() in {'1', 'true', 'yes'}
    security_proxy_flag = bool(security.get('is_proxy') or security.get('is_tor') or security.get('is_crawler'))
    # 'hosting' can produce false positives on mobile networks and enterprise ISPs.
    connection_proxy_flag = connection_type == 'proxy'

    vpn_detected = bool(header_vpn_flag or security_proxy_flag or connection_proxy_flag)
    discount_eligible = country_code == 'ZA' and not vpn_detected

    return {
        'ip': ip,
        'country_code': country_code,
        'currency': currency,
        'vpn_detected': vpn_detected,
        'discount_eligible': discount_eligible,
    }
