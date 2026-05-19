"""
PayPal subscription integration service.
Handles PayPal API calls for creating and managing subscriptions.
"""

import logging
import json
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# API Base URLs
PAYPAL_API_BASE = {
    'sandbox': 'https://api-m.sandbox.paypal.com',
    'live': 'https://api-m.paypal.com'
}

PAYPAL_WEB_BASE = {
    'sandbox': 'https://www.sandbox.paypal.com',
    'live': 'https://www.paypal.com'
}

# Pricing Configuration (USD only)
PRICING = {
    'USD': {
        'PRO': {
            'amount': '129.00',
            'currency': 'USD',
            'description': 'Dtailbase Professional Liability Engine'
        },
        'ENTERPRISE': {
            'amount': '299.00',
            'currency': 'USD',
            'description': 'Dtailbase Enterprise Asset Vault'
        }
    }
}

def get_effective_pricing():
    return PRICING


def get_paypal_access_token():
    """Get OAuth 2.0 access token from PayPal."""
    paypal_mode = getattr(settings, 'PAYPAL_MODE', 'sandbox')
    paypal_client_id = getattr(settings, 'PAYPAL_CLIENT_ID', '')
    paypal_client_secret = getattr(settings, 'PAYPAL_CLIENT_SECRET', '')

    logger.debug(
        f"PayPal config - MODE: {paypal_mode}, CLIENT_ID exists: {bool(paypal_client_id)}, SECRET exists: {bool(paypal_client_secret)}"
    )
    
    if not paypal_client_id or not paypal_client_secret:
        error_msg = (
            f"PayPal credentials not configured: CLIENT_ID={bool(paypal_client_id)}, SECRET={bool(paypal_client_secret)}"
        )
        logger.error(error_msg)
        return None
    
    url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/oauth2/token"
    headers = {'Accept': 'application/json', 'Accept-Language': 'en_US'}
    
    logger.debug(f"Requesting PayPal token from: {url}")
    
    try:
        response = requests.post(
            url,
            auth=(paypal_client_id, paypal_client_secret),
            headers=headers,
            data={'grant_type': 'client_credentials'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return data.get('access_token')
    except requests.RequestException as e:
        logger.error(f"Failed to get PayPal access token: {str(e)}")
        return None


def get_subscription_plan(plan_id, currency=None):
    """
    Get pricing details for a subscription plan (USD only).
    
    Args:
        plan_id: 'PRO' or 'ENTERPRISE'
        currency: ignored, always USD
    
    Returns:
        dict with plan details or None if not found
    """
    pricing_table = get_effective_pricing()

    if plan_id not in pricing_table.get('USD', {}):
        logger.error(f"Invalid plan: {plan_id}")
        return None
    
    return pricing_table['USD'][plan_id]


def create_paypal_subscription(user_email, plan_id, return_url, cancel_url, currency='USD', existing_subscription_id=None, start_time=None):
    """
    Create a PayPal subscription for a user using Subscriptions API (USD only).
    
    Args:
        user_email: User's email
        plan_id: 'PRO' or 'ENTERPRISE'
        return_url: Success return URL
        cancel_url: Cancel return URL
        currency: always USD, parameter kept for compatibility
    
    Returns:
        dict with 'success': bool, 'approval_url': str (if success), 'error': str (if failed)
    """
    currency = 'USD'
    
    access_token = get_paypal_access_token()
    if not access_token:
        return {'success': False, 'error': 'Failed to authenticate with PayPal'}
    
    plan_details = get_subscription_plan(plan_id, currency)
    if not plan_details:
        return {'success': False, 'error': f'Invalid plan: {plan_id}/{currency}'}
    
    try:
        paypal_mode = getattr(settings, 'PAYPAL_MODE', 'sandbox')
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        
        # Step 1: Ensure Product exists (or create it)
        # Use an app-owned identifier. PayPal reserves the PROD- prefix.
        product_id = 'DTAILBASE-SUBSCRIPTIONS-001'
        product_url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/catalogs/products/{product_id}"
        
        logger.info(f"Checking PayPal product: {product_id}")
        
        # Try to get the product
        product_response = requests.get(product_url, headers=headers, timeout=10)
        
        # If product doesn't exist (404), create it
        if product_response.status_code == 404:
            logger.info("Product not found, creating new product")
            products_url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/catalogs/products"
            product_payload = {
                'id': product_id,
                'name': 'Dtailbase Subscriptions',
                'description': 'Professional detailing management software',
                'type': 'SERVICE',
                'category': 'SOFTWARE'
            }
            
            product_create_response = requests.post(
                products_url,
                headers=headers,
                json=product_payload,
                timeout=10
            )

            if product_create_response.status_code >= 400:
                # Some PayPal accounts reject caller-provided product ids.
                # Retry without explicit id and use generated product id.
                logger.warning(
                    f"PayPal product creation with explicit id failed (status={product_create_response.status_code}). "
                    "Retrying with PayPal-generated product id."
                )
                fallback_payload = {
                    'name': 'Dtailbase Subscriptions',
                    'description': 'Professional detailing management software',
                    'type': 'SERVICE',
                    'category': 'SOFTWARE'
                }
                product_create_response = requests.post(
                    products_url,
                    headers=headers,
                    json=fallback_payload,
                    timeout=10
                )

            product_create_response.raise_for_status()
            created_product_data = product_create_response.json()
            product_id = created_product_data.get('id', product_id)
            logger.info(f"Created PayPal product: {product_id}")
        elif product_response.status_code == 200:
            logger.info(f"Product already exists: {product_id}")
        else:
            product_response.raise_for_status()
        
        # Step 2: Create a billing plan
        plan_url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/billing/plans"
        
        # Create unique plan name to avoid duplicates
        import time
        timestamp = int(time.time() * 1000)
        unique_plan_name = f"{plan_id}-{currency}-{timestamp}"
        
        plan_payload = {
            'product_id': product_id,
            'name': unique_plan_name,
            'description': plan_details['description'],
            'type': 'SUBSCRIPTION',
            'billing_cycles': [
                {
                    'frequency': {
                        'interval_unit': 'MONTH',
                        'interval_count': 1
                    },
                    'tenure_type': 'REGULAR',
                    'sequence': 1,
                    'total_cycles': 0,  # Infinite
                    'pricing_scheme': {
                        'fixed_price': {
                            'value': plan_details['amount'],
                            'currency_code': currency
                        }
                    }
                }
            ],
            'payment_preferences': {
                'auto_bill_outstanding': True,
                'setup_fee': {
                    'value': '0.00',
                    'currency_code': currency
                },
                'setup_fee_failure_action': 'CONTINUE',
                'payment_failure_threshold': 3
            }
        }
        
        logger.info(f"Creating billing plan with payload: {plan_payload}")
        
        plan_response = requests.post(
            plan_url,
            headers=headers,
            json=plan_payload,
            timeout=10
        )
        
        if plan_response.status_code >= 400:
            error_data = plan_response.json() if plan_response.headers.get('content-type') == 'application/json' else {}
            details = error_data.get('details') if isinstance(error_data, dict) else None
            issue = ''
            if isinstance(details, list) and details:
                issue = details[0].get('issue', '')
            error_msg = error_data.get('message', plan_response.text)
            if issue:
                error_msg = f"{error_msg} (issue: {issue})"
            logger.error(f"Failed to create billing plan: {error_msg}")
            return {'success': False, 'error': f'PayPal plan creation failed: {error_msg}'}
        
        plan_response.raise_for_status()
        plan_response_data = plan_response.json()
        plan_paypal_id = plan_response_data.get('id')
        
        logger.info(f"Created PayPal plan: {plan_paypal_id}")
        
        if not plan_paypal_id:
            return {'success': False, 'error': 'Failed to create billing plan'}
        
        # Step 3: Create subscription
        subscription_url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/billing/subscriptions"
        
        subscription_payload = {
            'plan_id': plan_paypal_id,
            'subscriber': {
                'name': {
                    'given_name': user_email.split('@')[0][:126]  # PayPal limits to 126 chars
                },
                'email_address': user_email
            },
            'application_context': {
                'brand_name': 'Dtailbase',
                'locale': 'en-US',
                'user_action': 'SUBSCRIBE_NOW',
                'return_url': return_url,
                'cancel_url': cancel_url
            }
        }

        # Defer billing start to the end of the current billing period when switching plans.
        if start_time:
            subscription_payload['start_time'] = start_time
            logger.info(f"New subscription deferred to start at: {start_time}")

        logger.info(f"Creating subscription with payload: {subscription_payload}")

        sub_response = requests.post(
            subscription_url,
            headers=headers,
            json=subscription_payload,
            timeout=10
        )
        
        if sub_response.status_code >= 400:
            error_data = sub_response.json() if sub_response.headers.get('content-type') == 'application/json' else {}
            error_msg = error_data.get('message', sub_response.text)
            logger.error(f"Failed to create subscription: {error_msg}")
            return {'success': False, 'error': f'PayPal subscription creation failed: {error_msg}'}
        
        sub_response.raise_for_status()
        sub_response_data = sub_response.json()
        subscription_id = sub_response_data.get('id')
        sub_status = (sub_response_data.get('status') or '').upper()
        
        logger.info(f"Created PayPal subscription: {subscription_id}, status: {sub_status}")

        # If PayPal activated the subscription directly (billing agreement reuse),
        # there is no approval step required.
        if sub_status == 'ACTIVE':
            return {
                'success': True,
                'approval_url': None,
                'subscription_id': subscription_id,
                'plan_id': plan_paypal_id,
                'already_active': True
            }

        # Get approval link
        links = sub_response_data.get('links', [])
        approval_url = None
        for link in links:
            if link.get('rel') == 'approve':
                approval_url = link.get('href')
                break
        
        if not approval_url:
            return {'success': False, 'error': 'No approval URL in response'}
        
        return {
            'success': True,
            'approval_url': approval_url,
            'subscription_id': subscription_id,
            'plan_id': plan_paypal_id
        }
    
    except requests.RequestException as e:
        error_msg = str(e)
        logger.error(f"PayPal API error: {error_msg}", exc_info=True)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                error_msg = error_data.get('message', error_msg)
            except:
                error_msg = e.response.text if e.response.text else error_msg
        return {'success': False, 'error': error_msg}
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Unexpected error in create_paypal_subscription: {error_msg}", exc_info=True)
        return {'success': False, 'error': error_msg}


def revise_paypal_subscription(existing_subscription_id, plan_id, return_url, cancel_url):
    """
    Revise an existing PayPal subscription to a new plan without requiring the
    subscriber to re-enter payment details.

    Calls POST /v1/billing/subscriptions/{id}/revise with a freshly created
    billing plan for the target Dtailbase tier.

    Returns:
        dict with 'success', 'approval_url' (may be None if already active),
        'subscription_id' (same as existing), and optionally 'already_active'.
    """
    currency = 'USD'

    access_token = get_paypal_access_token()
    if not access_token:
        return {'success': False, 'error': 'Failed to authenticate with PayPal'}

    plan_details = get_subscription_plan(plan_id, currency)
    if not plan_details:
        return {'success': False, 'error': f'Invalid plan: {plan_id}'}

    try:
        paypal_mode = getattr(settings, 'PAYPAL_MODE', 'sandbox')
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }

        # --- Step 1: ensure product exists (same logic as create_paypal_subscription) ---
        product_id = 'DTAILBASE-SUBSCRIPTIONS-001'
        product_url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/catalogs/products/{product_id}"
        product_response = requests.get(product_url, headers=headers, timeout=10)
        if product_response.status_code == 404:
            products_url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/catalogs/products"
            for payload in [
                {'id': product_id, 'name': 'Dtailbase Subscriptions',
                 'description': 'Professional detailing management software',
                 'type': 'SERVICE', 'category': 'SOFTWARE'},
                {'name': 'Dtailbase Subscriptions',
                 'description': 'Professional detailing management software',
                 'type': 'SERVICE', 'category': 'SOFTWARE'},
            ]:
                r = requests.post(products_url, headers=headers, json=payload, timeout=10)
                if r.status_code < 400:
                    product_id = r.json().get('id', product_id)
                    break
        elif product_response.status_code != 200:
            product_response.raise_for_status()

        # --- Step 2: create a new billing plan for the target tier ---
        import time
        timestamp = int(time.time() * 1000)
        plan_payload = {
            'product_id': product_id,
            'name': f"{plan_id}-USD-{timestamp}",
            'description': plan_details['description'],
            'type': 'SUBSCRIPTION',
            'billing_cycles': [{
                'frequency': {'interval_unit': 'MONTH', 'interval_count': 1},
                'tenure_type': 'REGULAR',
                'sequence': 1,
                'total_cycles': 0,
                'pricing_scheme': {
                    'fixed_price': {'value': plan_details['amount'], 'currency_code': currency}
                }
            }],
            'payment_preferences': {
                'auto_bill_outstanding': True,
                'setup_fee': {'value': '0.00', 'currency_code': currency},
                'setup_fee_failure_action': 'CONTINUE',
                'payment_failure_threshold': 3
            }
        }
        plan_response = requests.post(
            f"{PAYPAL_API_BASE[paypal_mode]}/v1/billing/plans",
            headers=headers, json=plan_payload, timeout=10
        )
        if plan_response.status_code >= 400:
            error_data = plan_response.json() if plan_response.content else {}
            return {'success': False, 'error': f"PayPal plan creation failed: {error_data.get('message', plan_response.text)}"}
        plan_paypal_id = plan_response.json().get('id')
        if not plan_paypal_id:
            return {'success': False, 'error': 'Failed to create billing plan for revision'}

        logger.info(f"Revising subscription {existing_subscription_id} to plan {plan_paypal_id} ({plan_id})")

        # --- Step 3: revise the existing subscription ---
        revise_payload = {
            'plan_id': plan_paypal_id,
            'application_context': {
                'brand_name': 'Dtailbase',
                'locale': 'en-US',
                'return_url': return_url,
                'cancel_url': cancel_url,
            }
        }
        revise_url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/billing/subscriptions/{existing_subscription_id}/revise"
        revise_response = requests.post(revise_url, headers=headers, json=revise_payload, timeout=10)

        if revise_response.status_code >= 400:
            error_data = revise_response.json() if revise_response.content else {}
            error_msg = error_data.get('message', revise_response.text)
            logger.error(f"PayPal subscription revision failed: {error_msg}")
            return {'success': False, 'error': f'PayPal revision failed: {error_msg}'}

        revise_data = revise_response.json()
        links = revise_data.get('links', [])
        approval_url = next((l['href'] for l in links if l.get('rel') == 'approve'), None)

        # If PayPal confirms immediately (no approval link), the revision is live.
        if not approval_url:
            logger.info(f"Subscription {existing_subscription_id} revised immediately to {plan_id}")
            return {
                'success': True,
                'approval_url': None,
                'subscription_id': existing_subscription_id,
                'already_active': True,
            }

        return {
            'success': True,
            'approval_url': approval_url,
            'subscription_id': existing_subscription_id,
        }

    except requests.RequestException as e:
        error_msg = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_msg = e.response.json().get('message', error_msg)
            except Exception:
                error_msg = e.response.text or error_msg
        logger.error(f"PayPal revision request error: {error_msg}", exc_info=True)
        return {'success': False, 'error': error_msg}
    except Exception as e:
        logger.error(f"Unexpected error in revise_paypal_subscription: {str(e)}", exc_info=True)
        return {'success': False, 'error': str(e)}


def verify_paypal_webhook(webhook_data, request_headers=None):
    """
    Verify PayPal webhook signature.
    Uses PayPal's verify-webhook-signature endpoint for modern webhooks.
    Falls back to permissive handling for legacy IPN-style payloads.
    """
    headers = request_headers or {}

    # Legacy IPN fallback payload (no modern webhook signature headers)
    if 'txn_type' in webhook_data and 'PAYPAL-TRANSMISSION-ID' not in headers:
        logger.warning("Processing legacy IPN payload without modern signature headers")
        return True

    paypal_webhook_id = getattr(settings, 'PAYPAL_WEBHOOK_ID', '')
    if not paypal_webhook_id:
        logger.error("PAYPAL_WEBHOOK_ID is not configured")
        return False

    transmission_id = headers.get('PAYPAL-TRANSMISSION-ID')
    transmission_time = headers.get('PAYPAL-TRANSMISSION-TIME')
    transmission_sig = headers.get('PAYPAL-TRANSMISSION-SIG')
    cert_url = headers.get('PAYPAL-CERT-URL')
    auth_algo = headers.get('PAYPAL-AUTH-ALGO')

    required_headers = [
        transmission_id,
        transmission_time,
        transmission_sig,
        cert_url,
        auth_algo,
    ]
    if not all(required_headers):
        logger.error("Missing required PayPal webhook signature headers")
        return False

    access_token = get_paypal_access_token()
    if not access_token:
        return False

    try:
        paypal_mode = getattr(settings, 'PAYPAL_MODE', 'sandbox')
        url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/notifications/verify-webhook-signature"
        req_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        payload = {
            'auth_algo': auth_algo,
            'cert_url': cert_url,
            'transmission_id': transmission_id,
            'transmission_sig': transmission_sig,
            'transmission_time': transmission_time,
            'webhook_id': paypal_webhook_id,
            'webhook_event': webhook_data,
        }

        response = requests.post(url, headers=req_headers, data=json.dumps(payload), timeout=10)
        response.raise_for_status()
        verification_data = response.json()
        status = (verification_data.get('verification_status') or '').upper()

        if status != 'SUCCESS':
            logger.error(f"PayPal webhook verification failed: {verification_data}")
            return False

        return True
    except requests.RequestException as e:
        logger.error(f"PayPal webhook verification request failed: {str(e)}")
        return False


def get_paypal_subscription_details(subscription_id):
    """
    Fetch subscription details from PayPal Subscriptions API.

    Returns:
        dict with subscription details, or None on failure.
    """
    access_token = get_paypal_access_token()
    if not access_token:
        return None

    try:
        paypal_mode = getattr(settings, 'PAYPAL_MODE', 'sandbox')
        url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/billing/subscriptions/{subscription_id}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        
        # Include payment_source in the response
        params = {'fields': 'payment_source'}

        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch PayPal subscription {subscription_id}: {str(e)}")
        return None


def get_paypal_plan_tier(subscription_id):
    """
    Resolve Dtailbase plan tier (PRO/ENTERPRISE) from a PayPal subscription.

    Returns:
        tuple (plan_tier, status) where plan_tier is PRO/ENTERPRISE or None.
    """
    subscription_data = get_paypal_subscription_details(subscription_id)
    if not subscription_data:
        return None, None

    status = (subscription_data.get('status') or '').upper()
    plan_paypal_id = subscription_data.get('plan_id')
    if not plan_paypal_id:
        return None, status

    return get_paypal_tier_from_plan_id(plan_paypal_id), status


def get_paypal_tier_from_plan_id(plan_paypal_id):
    """
    Resolve Dtailbase plan tier (PRO/ENTERPRISE) from a PayPal billing plan id.
    """
    if not plan_paypal_id:
        return None

    access_token = get_paypal_access_token()
    if not access_token:
        return None

    try:
        paypal_mode = getattr(settings, 'PAYPAL_MODE', 'sandbox')
        url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/billing/plans/{plan_paypal_id}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }

        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        plan_data = response.json()
        plan_name = (plan_data.get('name') or '').upper()

        if plan_name.startswith('PRO-'):
            return 'PRO'
        if plan_name.startswith('ENTERPRISE-'):
            return 'ENTERPRISE'

        logger.warning(f"Unable to infer Dtailbase tier from PayPal plan name '{plan_name}'")
        return None
    except requests.RequestException as e:
        logger.error(f"Failed to fetch PayPal plan {plan_paypal_id}: {str(e)}")
        return None


def cancel_subscription(subscription_id):
    """
    Cancel a PayPal subscription.
    
    Args:
        subscription_id: PayPal subscription ID
    
    Returns:
        dict: {
            success: bool,
            message: str,
            error: str | None
        }
    """
    access_token = get_paypal_access_token()
    if not access_token:
        return {
            'success': False,
            'message': '',
            'error': 'Unable to authenticate with PayPal',
        }
    
    try:
        paypal_mode = getattr(settings, 'PAYPAL_MODE', 'sandbox')
        url = f"{PAYPAL_API_BASE[paypal_mode]}/v1/billing/subscriptions/{subscription_id}/cancel"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        }
        
        response = requests.post(
            url,
            headers=headers,
            json={'reason': 'User requested cancellation'},
            timeout=10
        )

        if response.status_code in (200, 204):
            logger.info(f"Cancelled PayPal subscription: {subscription_id}")
            return {
                'success': True,
                'message': 'Subscription cancelled on PayPal.',
                'error': None,
            }

        # PayPal may return non-2xx for already-cancelled/inactive subscriptions.
        try:
            error_data = response.json()
        except Exception:
            error_data = {}

        issue = ''
        details = error_data.get('details')
        if isinstance(details, list) and details:
            issue = details[0].get('issue', '')
        message = error_data.get('message', '')

        already_inactive_issues = {
            'SUBSCRIPTION_STATUS_INVALID',
            'RESOURCE_NOT_FOUND',
            'INVALID_RESOURCE_ID',
        }
        if response.status_code in (404, 422) or issue in already_inactive_issues:
            logger.warning(
                f"PayPal cancel returned inactive/not-found for {subscription_id}: "
                f"status={response.status_code}, issue={issue}, message={message}"
            )
            return {
                'success': True,
                'message': 'Subscription is already inactive on PayPal.',
                'error': None,
            }

        error_msg = message or issue or f'PayPal cancel failed with status {response.status_code}'
        logger.error(f"Failed to cancel subscription {subscription_id}: {error_msg}")
        return {
            'success': False,
            'message': '',
            'error': error_msg,
        }
    except Exception as e:
        logger.error(f"Failed to cancel subscription {subscription_id}: {str(e)}")
        return {
            'success': False,
            'message': '',
            'error': str(e),
        }
