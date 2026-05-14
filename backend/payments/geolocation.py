"""
Geolocation service to detect user country from IP address.
Uses ipstack.com API for IP geolocation.
"""

import requests
import logging
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

IPSTACK_URL = 'https://api.ipstack.com'
CACHE_TIMEOUT = 86400 * 30  # Cache for 30 days


def get_country_from_ip(ip_address):
    """
    Detect country code from IP address using ipstack.com.
    Returns country code (e.g., 'ZA', 'US') or 'US' as default.
    """
    
    # Handle localhost/invalid IPs
    if ip_address in ('127.0.0.1', '::1', 'localhost'):
        return 'US'  # Default for local development
    
    # Check cache first
    cache_key = f'geoip_{ip_address}'
    cached_country = cache.get(cache_key)
    
    if cached_country:
        logger.info(f"Country for IP {ip_address} retrieved from cache: {cached_country}")
        return cached_country
    
    ipstack_api_key = getattr(settings, 'IPSTACK_API_KEY', '')

    # If no API key configured, return default
    if not ipstack_api_key:
        logger.warning("IPSTACK_API_KEY not configured in settings")
        return 'US'
    
    try:
        # Make API request to ipstack
        response = requests.get(
            f'{IPSTACK_URL}/{ip_address}',
            params={'access_key': ipstack_api_key},
            timeout=5
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Handle errors from ipstack
        if 'error' in data:
            logger.warning(f"ipstack error for IP {ip_address}: {data['error']}")
            return 'US'
        
        country_code = data.get('country_code', 'US')
        
        # Cache the result
        cache.set(cache_key, country_code, CACHE_TIMEOUT)
        
        logger.info(f"Country for IP {ip_address}: {country_code}")
        return country_code
        
    except requests.RequestException as e:
        logger.error(f"Failed to fetch geolocation for IP {ip_address}: {str(e)}")
        return 'US'  # Default fallback
    except Exception as e:
        logger.error(f"Unexpected error in get_country_from_ip: {str(e)}")
        return 'US'


def get_client_ip(request):
    """
    Extract client IP from request, handling proxies and load balancers.
    """
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
    country_code = (request.META.get('HTTP_CF_IPCOUNTRY') or '').upper()
    if len(country_code) != 2 or country_code == 'XX':
        ip = get_client_ip(request)
        country_code = get_country_from_ip(ip)
    
    # Map country code to currency
    if country_code == 'ZA':
        currency = 'ZAR'
    else:
        currency = 'USD'
    
    return country_code, currency
