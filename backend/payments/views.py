import os
import logging
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from core.models import Company
from core.permissions import IsAccountAdmin
from payments.geolocation import detect_pricing_context
from payments.paypal_service import (
    create_paypal_subscription,
    get_subscription_plan,
    get_effective_pricing,
    get_paypal_plan_tier,
    get_paypal_tier_from_plan_id,
    get_paypal_subscription_details,
    cancel_subscription,
    verify_paypal_webhook,
    PRICING
)

logger = logging.getLogger(__name__)



# Use PlansView for plan/pricing info
class PlansView(APIView):
    """
    Get available plans and pricing based on user's detected country/currency.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            from core.plan_limits import PLAN_CONFIG

            def safe_plan(plan):
                return {
                    k: ("unlimited" if isinstance(v, float) and v == float('inf') else v)
                    for k, v in plan.items()
                }

            pricing_context = detect_pricing_context(request)
            detected_country_code = pricing_context.get('country_code', 'US')
            vpn_detected = pricing_context.get('vpn_detected', False)
            company_country_code = None
            if request.user.is_authenticated and hasattr(request.user, 'company') and request.user.company:
                company_country_code = (request.user.company.country_code or '').upper() or None

            effective_country_code = company_country_code or detected_country_code
            country_code = (effective_country_code or 'US').upper()
            currency = 'USD'
            pricing = get_effective_pricing().get('USD', {})

            plans = {}
            for plan_name in PLAN_CONFIG:
                plan_config = PLAN_CONFIG[plan_name]
                display_features = plan_config.get('features', [])
                limits = safe_plan({k: v for k, v in plan_config.items() if k != 'features'})
                if plan_name == 'STARTER':
                    price = '0'
                else:
                    price = pricing[plan_name]['amount']
                plans[plan_name] = {
                    'features': display_features,
                    'limits': limits,
                    'price': price,
                    'currency': currency,
                }

            return Response({
                'country_code': country_code,
                'currency': currency,
                'vpn_detected': vpn_detected,
                'pricing': pricing,
                'plans': plans
            })
        except Exception as e:
            logger.error(f"Error in PlansView: {str(e)}")
            return Response({'error': str(e)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class PayPalSubscribeView(APIView):
    """
    Initiate a PayPal subscription.
    Called when user clicks the upgrade button.
    """
    permission_classes = [IsAuthenticated, IsAccountAdmin]

    def post(self, request):
        try:
            plan_id = request.data.get('plan_id')
            user = request.user
            
            # Check if user has company
            if not hasattr(user, 'company') or not user.company:
                logger.error(f"User {user.id} has no company")
                return Response({'error': 'User company not found'}, status=400)
            
            company = user.company
            
            # Validate plan
            if plan_id not in ['PRO', 'ENTERPRISE']:
                return Response({'error': 'Invalid plan'}, status=400)
            
            # USD-only billing
            logger.info(f"Creating PayPal subscription: user={user.email}, plan={plan_id}, currency=USD")
            previous_subscription_id = company.paypal_subscription_id

            # When switching plans, defer the new subscription's start to the end of
            # the current billing period so the user isn't billed twice.
            start_time = None
            if previous_subscription_id:
                existing_details = get_paypal_subscription_details(previous_subscription_id)
                if existing_details:
                    next_billing_time = (
                        existing_details.get('billing_info', {}).get('next_billing_time')
                        # Fallback: for deferred/new subs the top-level start_time is the
                        # first (and thus next) billing date.  Do NOT use start_time from
                        # cancelled/expired subs — it is a historical date and would cause
                        # an immediate charge on the replacement subscription.
                        or existing_details.get('start_time')
                    )
                    if next_billing_time:
                        from django.utils.dateparse import parse_datetime as _parse_nbt
                        from django.utils import timezone as _tz_nbt
                        _nbt_parsed = _parse_nbt(next_billing_time)
                        if _nbt_parsed and _nbt_parsed > _tz_nbt.now():
                            start_time = next_billing_time
                            logger.info(
                                f"Deferring new subscription start to {start_time} "
                                f"(end of current billing period for {previous_subscription_id})"
                            )
                        else:
                            logger.info(
                                f"Ignoring past/expired billing time '{next_billing_time}' "
                                f"from subscription {previous_subscription_id} — "
                                f"will fall back to subscription_ends_at if available"
                            )

            # If the previous subscription is cancelled (e.g. user re-subscribing after
            # a pending STARTER downgrade), fall back to the stored period-end date so
            # the new subscription doesn't bill immediately.
            from django.utils import timezone as _tz
            if not start_time and company.subscription_ends_at and company.subscription_ends_at > _tz.now():
                start_time = company.subscription_ends_at.isoformat()
                logger.info(f"Using stored billing period end as start_time: {start_time}")
            
            plan_details = get_subscription_plan(plan_id)
            if not plan_details:
                return Response({'error': f'Plan {plan_id} not available'}, status=400)

            # Calculate prorated setup fee for mid-cycle upgrades.
            # The user immediately pays (new_price - old_price) * remaining_days / 30
            # so they get access now and the first full charge starts at the next renewal.
            _PLAN_TIER = {'STARTER': 0, 'PRO': 1, 'ENTERPRISE': 2}
            setup_fee = None
            if (
                start_time is not None
                and _PLAN_TIER.get(plan_id, 0) > _PLAN_TIER.get(company.plan, 0)
            ):
                from django.utils.dateparse import parse_datetime as _parse_dt
                from django.utils import timezone as _tz
                next_billing_dt = _parse_dt(start_time)
                if next_billing_dt:
                    remaining_seconds = (next_billing_dt - _tz.now()).total_seconds()
                    if remaining_seconds > 0:
                        remaining_days = remaining_seconds / 86400
                        current_plan_details = get_subscription_plan(company.plan)
                        if current_plan_details:
                            price_diff = float(plan_details['amount']) - float(current_plan_details['amount'])
                            if price_diff > 0:
                                proration = round(price_diff * remaining_days / 30, 2)
                                if proration >= 0.01:
                                    setup_fee = f"{proration:.2f}"
                                    logger.info(
                                        f"Proration: {company.plan}→{plan_id}, "
                                        f"{remaining_days:.1f} days remaining, "
                                        f"setup_fee={setup_fee} USD"
                                    )

            # Generate return/cancel URLs
            domain = os.environ.get('PUBLIC_BASE_URL', 'https://www.dtailbase.com').rstrip('/')
            return_url = f"{domain}/payment-success?plan={plan_id}"
            cancel_url = f"{domain}/plans"

            result = create_paypal_subscription(
                user_email=user.email,
                plan_id=plan_id,
                return_url=return_url,
                cancel_url=cancel_url,
                currency='USD',
                start_time=start_time,
                setup_fee=setup_fee,
            )

            if result.get('success'):
                subscription_id = result.get('subscription_id', '')

                # Do NOT cancel the previous subscription here. Cancelling before the
                # user approves the new subscription on PayPal would leave the company
                # with no active subscription if they cancel the checkout flow.
                # Instead, store the old subscription ID in cache so the
                # BILLING.SUBSCRIPTION.ACTIVATED webhook can cancel it once payment
                # is confirmed.
                if previous_subscription_id and previous_subscription_id != subscription_id:
                    cache.set(
                        f"paypal:prev_sub:{subscription_id}",
                        previous_subscription_id,
                        timeout=7 * 24 * 3600,  # 7 days
                    )
                    logger.info(
                        f"Stored previous subscription {previous_subscription_id} in cache "
                        f"for new subscription {subscription_id} (company {company.id}) — "
                        f"will be cancelled on activation."
                    )

                # Detect paid-to-paid downgrades and defer the plan change.
                is_downgrade = (
                    start_time is not None
                    and _PLAN_TIER.get(plan_id, 0) < _PLAN_TIER.get(company.plan, 0)
                )
                company.paypal_subscription_id = subscription_id
                if is_downgrade:
                    from django.utils.dateparse import parse_datetime
                    ends_at = parse_datetime(start_time)
                    if ends_at:
                        company.pending_downgrade_plan = plan_id
                        company.subscription_ends_at = ends_at
                        company.is_subscription_active = True
                        # Explicitly include 'plan' and 'is_subscription_active' so that
                        # a BILLING.SUBSCRIPTION.CANCELLED webhook for the old subscription
                        # (which may arrive before this save) cannot corrupt these fields.
                        company.save(update_fields=[
                            'paypal_subscription_id', 'pending_downgrade_plan',
                            'subscription_ends_at', 'plan', 'is_subscription_active',
                        ])
                        logger.info(
                            f"AUDIT: Deferred plan downgrade - Company: {company.id}, "
                            f"{company.plan} → {plan_id} effective {ends_at}"
                        )
                    else:
                        company.save(update_fields=['paypal_subscription_id'])
                else:
                    # Clear any pending downgrade — user has made a new subscription
                    # decision (e.g. reverting a downgrade before the renewal date).
                    save_fields = ['paypal_subscription_id']
                    if company.pending_downgrade_plan:
                        company.pending_downgrade_plan = ''
                        company.subscription_ends_at = None
                        save_fields += ['pending_downgrade_plan', 'subscription_ends_at']
                        logger.info(
                            f"AUDIT: Pending downgrade cancelled - Company: {company.id}, "
                            f"reverting to {plan_id}"
                        )
                    company.save(update_fields=save_fields)
                logger.info(f"Stored subscription_id for company {company.id}: {subscription_id}")
                
                return Response({
                    'success': True,
                    'approval_url': result.get('approval_url'),
                    'subscription_id': subscription_id,
                    'amount': plan_details['amount'],
                    'currency': 'USD',
                })
            else:
                error_msg = result.get('error', 'Failed to create subscription')
                logger.error(f"Failed to create subscription: {error_msg}")
                return Response({'error': error_msg}, status=500)
        
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in PayPalSubscribeView: {error_msg}", exc_info=True)
            return Response({'error': error_msg}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class PayPalCancelSubscriptionView(APIView):
    """Cancel the active PayPal subscription. The plan downgrade is deferred to the end
    of the already-paid billing period so the user keeps access they paid for."""
    permission_classes = [IsAuthenticated, IsAccountAdmin]

    def post(self, request):
        try:
            from django.utils.dateparse import parse_datetime
            from django.utils import timezone

            user = request.user
            if not hasattr(user, 'company') or not user.company:
                return Response({'error': 'User company not found'}, status=400)

            company = user.company
            subscription_id = company.paypal_subscription_id
            if not subscription_id:
                return Response({'error': 'No active PayPal subscription found'}, status=400)

            # Fetch next billing time BEFORE cancelling so we know when access expires.
            subscription_ends_at = None
            try:
                existing_details = get_paypal_subscription_details(subscription_id)
                if existing_details:
                    next_billing_raw = (
                        existing_details.get('billing_info', {}).get('next_billing_time')
                        # Fallback for deferred/new subs: top-level start_time is the
                        # first (and thus next) billing date.
                        or existing_details.get('start_time')
                    )
                    if next_billing_raw:
                        subscription_ends_at = parse_datetime(next_billing_raw)
            except Exception as fetch_err:
                logger.warning(f"Could not fetch subscription end date: {fetch_err}")

            cancel_result = cancel_subscription(subscription_id)
            if not cancel_result.get('success'):
                return Response(
                    {'error': cancel_result.get('error') or 'Failed to cancel PayPal subscription'},
                    status=502
                )

            old_plan = company.plan

            if subscription_ends_at and subscription_ends_at > timezone.now():
                # Defer downgrade: user has paid for the rest of the billing period.
                company.pending_downgrade_plan = 'STARTER'
                company.subscription_ends_at = subscription_ends_at
                # Keep plan and is_subscription_active unchanged until period ends.
                company.save(update_fields=['pending_downgrade_plan', 'subscription_ends_at'])

                logger.info(
                    f"AUDIT: Subscription cancelled (deferred) - Company: {company.id}, "
                    f"Cancelled by: {user.email}, "
                    f"Plan downgrade: {old_plan} → STARTER scheduled at {subscription_ends_at}, "
                    f"Subscription ID: {subscription_id}"
                )

                return Response({
                    'success': True,
                    'message': (
                        f'Subscription cancelled. Your {old_plan} plan access continues until '
                        f'{subscription_ends_at.strftime("%d %b %Y")}, then downgrades to Starter.'
                    ),
                    'plan': company.plan,
                    'subscription_ends_at': subscription_ends_at.isoformat(),
                }, status=200)
            else:
                # No valid end date found — apply downgrade immediately.
                company.is_subscription_active = False
                company.plan = 'STARTER'
                company.paypal_subscription_id = ''
                company.pending_downgrade_plan = ''
                company.subscription_ends_at = None
                company.save(update_fields=['is_subscription_active', 'plan', 'paypal_subscription_id', 'pending_downgrade_plan', 'subscription_ends_at'])

                logger.info(
                    f"AUDIT: Subscription cancelled (immediate) - Company: {company.id}, "
                    f"Cancelled by: {user.email}, "
                    f"Plan downgrade: {old_plan} → STARTER, "
                    f"Subscription ID: {subscription_id}"
                )

                return Response({
                    'success': True,
                    'message': cancel_result.get('message') or 'Subscription cancelled. Plan downgraded to Starter.',
                    'plan': company.plan,
                }, status=200)
        except Exception as e:
            logger.error(f"Error in PayPalCancelSubscriptionView: {str(e)}", exc_info=True)
            return Response({'error': 'Unable to cancel subscription right now'}, status=500)


class BillingSummaryView(APIView):
    """Return current billing, subscription, and payment method details for the authenticated company."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            if not hasattr(user, 'company') or not user.company:
                return Response({'error': 'User company not found'}, status=400)

            company = user.company
            # Lazily apply any pending downgrade whose period has now elapsed.
            company.apply_pending_downgrade_if_due()

            currency = (company.currency or 'USD').upper()
            plan = (company.plan or 'STARTER').upper()

            # Defensive cleanup: a pending downgrade that targets the already-current
            # plan is a no-op and causes confusing UI/state.
            pending_plan = (company.pending_downgrade_plan or '').upper()
            if pending_plan and pending_plan == plan:
                company.pending_downgrade_plan = ''
                company.subscription_ends_at = None
                company.save(update_fields=['pending_downgrade_plan', 'subscription_ends_at'])
                pending_plan = ''

            base_pricing = PRICING.get(currency, PRICING['USD'])
            plan_pricing = base_pricing.get(plan, {}) if plan != 'STARTER' else {}
            monthly_amount = '0.00' if plan == 'STARTER' else str(plan_pricing.get('amount', '0.00'))

            summary = {
                'plan': plan,
                'currency': currency,
                'is_subscription_active': bool(company.is_subscription_active),
                'paypal_subscription_id': company.paypal_subscription_id or '',
                'subscription_status': 'INACTIVE',
                'billing_cycle': 'MONTHLY',
                'monthly_amount': monthly_amount,
                'next_billing_time': None,
                'last_payment': None,
                'payment_method': None,
                'cancel_available': bool(company.paypal_subscription_id),
                'pending_downgrade_plan': pending_plan,
                'subscription_ends_at': company.subscription_ends_at.isoformat() if company.subscription_ends_at else None,
            }

            subscription_id = company.paypal_subscription_id
            if not subscription_id:
                return Response(summary, status=200)

            subscription_data = get_paypal_subscription_details(subscription_id)
            if not subscription_data:
                summary['subscription_status'] = 'UNKNOWN'
                logger.warning(f"No subscription data returned for {subscription_id}")
                return Response(summary, status=200)

            logger.info(f"Subscription data keys: {subscription_data.keys()}")
            subscription_status = (subscription_data.get('status') or '').upper() or 'UNKNOWN'
            summary['subscription_status'] = subscription_status

            billing_info = subscription_data.get('billing_info') or {}
            summary['next_billing_time'] = billing_info.get('next_billing_time')

            last_payment = billing_info.get('last_payment') or {}
            if last_payment:
                amount_info = last_payment.get('amount') or {}
                summary['last_payment'] = {
                    'time': last_payment.get('time'),
                    'amount': amount_info.get('value'),
                    'currency': amount_info.get('currency_code') or currency,
                }

            payment_source = subscription_data.get('payment_source') or {}
            logger.info(f"Payment source data for {subscription_id}: {payment_source}")
            payment_method = None

            if isinstance(payment_source.get('card'), dict):
                card = payment_source['card']
                brand = (card.get('brand') or card.get('type') or 'Card').upper()
                last_digits = card.get('last_digits') or card.get('last_4') or ''
                masked = f"{brand} •••• {last_digits}".strip() if last_digits else brand
                payment_method = {
                    'type': 'CARD',
                    'brand': brand,
                    'last4': last_digits,
                    'expiry': card.get('expiry') or card.get('expiry_date'),
                    'display': masked,
                }
                logger.info(f"Extracted card payment method: {payment_method}")
            elif isinstance(payment_source.get('paypal'), dict):
                paypal_source = payment_source['paypal']
                email = paypal_source.get('email_address')
                display = f"PayPal ({email})" if email else 'PayPal Wallet'
                payment_method = {
                    'type': 'PAYPAL',
                    'email': email,
                    'display': display,
                }
                logger.info(f"Extracted PayPal payment method: {payment_method}")

            if payment_method:
                summary['payment_method'] = payment_method
            else:
                # PayPal doesn't populate payment_source until the first billing cycle.
                # Fall back to the subscriber email so we show *something* meaningful.
                subscriber_email = (subscription_data.get('subscriber') or {}).get('email_address')
                if subscriber_email:
                    payment_method = {
                        'type': 'PAYPAL',
                        'email': subscriber_email,
                        'display': f"PayPal ({subscriber_email})",
                    }
                    summary['payment_method'] = payment_method
                    logger.info(f"Falling back to subscriber email for payment method: {subscriber_email}")
                else:
                    logger.warning(f"No payment method found for subscription {subscription_id}")

            return Response(summary, status=200)
        except Exception as e:
            logger.error(f"Error in BillingSummaryView: {str(e)}", exc_info=True)
            return Response({'error': 'Unable to load billing summary right now'}, status=500)


class PayPalWebhookView(APIView):
    """
    Handle PayPal IPN (Instant Payment Notifications) webhooks.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        try:
            data = request.data.copy()

            event_id = (data.get('id') or '').strip()
            if event_id:
                dedupe_key = f"paypal:webhook:event:{event_id}"
                if cache.get(dedupe_key):
                    logger.info(f"Skipping duplicate PayPal webhook event: {event_id}")
                    return Response(status=200)
            
            if not verify_paypal_webhook(data, request.headers):
                logger.warning("Invalid PayPal webhook signature")
                return Response(status=403)

            if event_id:
                cache.set(dedupe_key, True, timeout=60 * 60 * 24)
            
            event_type = (data.get('event_type') or data.get('txn_type') or '').upper()

            # ── Diagnostic ring-buffer ────────────────────────────────────────────
            # Log the full incoming event so we can audit exactly what PayPal sends
            # at each stage of the subscription lifecycle.
            _resource_diag = data.get('resource', {}) if isinstance(data.get('resource'), dict) else {}
            _diag_entry = {
                'event_type': event_type,
                'event_id': event_id,
                'subscription_id': (
                    _resource_diag.get('id')
                    or _resource_diag.get('billing_agreement_id')
                    or ''
                ),
                'resource_status': (_resource_diag.get('status') or '').upper(),
                'plan_id': _resource_diag.get('plan_id', ''),
                'ts': str(__import__('datetime').datetime.utcnow()),
            }
            logger.info(
                f"PAYPAL WEBHOOK RECEIVED | event_type={_diag_entry['event_type']} | "
                f"subscription_id={_diag_entry['subscription_id']} | "
                f"resource_status={_diag_entry['resource_status']} | "
                f"plan_id={_diag_entry['plan_id']} | "
                f"event_id={_diag_entry['event_id']}"
            )
            # Store up to the last 20 events in cache for the debug endpoint.
            _recent: list = cache.get('paypal:webhook:recent', [])
            _recent.insert(0, _diag_entry)
            cache.set('paypal:webhook:recent', _recent[:20], timeout=7 * 24 * 3600)
            # ─────────────────────────────────────────────────────────────────────

            if event_type in {
                'BILLING.SUBSCRIPTION.CREATED',
                'BILLING.SUBSCRIPTION.UPDATED',
                'BILLING.SUBSCRIPTION.ACTIVATED',
                'SUBSCR_SIGNUP',
            }:
                return self._handle_subscription_created(data, event_type)

            if event_type in {
                'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED',
                'PAYMENT.SALE.COMPLETED',
                'SUBSCR_PAYMENT',
            }:
                return self._handle_subscription_payment(data)

            if event_type in {
                'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
                'SUBSCR_FAILED',
            }:
                return self._handle_subscription_failed(data)

            if event_type in {
                'BILLING.SUBSCRIPTION.CANCELLED',
                'BILLING.SUBSCRIPTION.SUSPENDED',
                'BILLING.SUBSCRIPTION.EXPIRED',
                'SUBSCR_CANCEL',
                'SUBSCR_EOT',
            }:
                return self._handle_subscription_cancelled(data)

            logger.info(f"Unhandled PayPal event type: {event_type}")
            return Response(status=200)
        
        except Exception as e:
            logger.error(f"Error in PayPal webhook: {str(e)}")
            return Response(status=200)  # Return 200 anyway to prevent retries
    
    def _extract_resource(self, data):
        resource = data.get('resource') if isinstance(data, dict) else None
        return resource if isinstance(resource, dict) else {}

    def _extract_subscription_id(self, data):
        resource = self._extract_resource(data)
        related_ids = resource.get('supplementary_data', {}).get('related_ids', {})
        return (
            resource.get('id')
            or resource.get('billing_agreement_id')
            or related_ids.get('subscription_id')
            or data.get('subscr_id')
        )

    def _extract_subscriber_email(self, data):
        resource = self._extract_resource(data)
        subscriber = resource.get('subscriber', {})
        return (
            subscriber.get('email_address')
            or resource.get('payer_email')
            or data.get('payer_email')
        )

    def _extract_plan_paypal_id(self, data):
        resource = self._extract_resource(data)
        return resource.get('plan_id')

    def _get_company_for_event(self, data):
        subscription_id = self._extract_subscription_id(data)
        if subscription_id:
            company = Company.objects.filter(paypal_subscription_id=subscription_id).first()
            if company:
                return company

        subscriber_email = self._extract_subscriber_email(data)
        if not subscriber_email:
            return None

        from accounts.models import User
        user = User.objects.filter(email=subscriber_email).first()
        return user.company if user else None

    def _handle_subscription_created(self, data, event_type):
        """Handle subscription lifecycle create/update/activation."""
        try:
            from django.utils import timezone as tz
            company = self._get_company_for_event(data)
            if not company:
                logger.warning("Company not found for subscription create/update webhook")
                return Response(status=200)

            subscription_id = self._extract_subscription_id(data)
            resource_status = (self._extract_resource(data).get('status') or '').upper()
            plan_paypal_id = self._extract_plan_paypal_id(data)

            update_fields = []
            if subscription_id and company.paypal_subscription_id != subscription_id:
                company.paypal_subscription_id = subscription_id
                update_fields.append('paypal_subscription_id')

            plan_tier = None
            if plan_paypal_id:
                plan_tier = get_paypal_tier_from_plan_id(plan_paypal_id)
            if not plan_tier and subscription_id:
                plan_tier, _ = get_paypal_plan_tier(subscription_id)

            # Skip plan update when a deferred downgrade is in progress and the
            # billing period hasn't ended yet — the new subscription was created but
            # the user has already paid for the current period.
            _TIER_ORDER = {'STARTER': 0, 'PRO': 1, 'ENTERPRISE': 2}
            is_deferred_downgrade = (
                plan_tier
                and company.pending_downgrade_plan == plan_tier
                and company.subscription_ends_at
                and company.subscription_ends_at > tz.now()
            )

            # Race-condition guard: BILLING.SUBSCRIPTION.CREATED can arrive before
            # the subscribe view has committed pending_downgrade_plan to the DB.
            # If the webhook resource carries a future start_time AND the tier would
            # be a downgrade, treat it as deferred so we don't flip the plan early.
            if not is_deferred_downgrade and plan_tier:
                resource = self._extract_resource(data)
                sub_start_raw = resource.get('start_time') if resource else None
                if sub_start_raw and _TIER_ORDER.get(plan_tier, 0) < _TIER_ORDER.get(company.plan, 0):
                    from django.utils.dateparse import parse_datetime as _pdt_sub
                    _sub_start_dt = _pdt_sub(sub_start_raw)
                    if _sub_start_dt and _sub_start_dt > tz.now():
                        is_deferred_downgrade = True
                        logger.info(
                            f"Deferred-downgrade race guard triggered for company {company.id}: "
                            f"subscription start_time={sub_start_raw}, "
                            f"plan {company.plan} → {plan_tier} (pending_downgrade not yet saved)"
                        )

            is_activation = event_type == 'BILLING.SUBSCRIPTION.ACTIVATED' or resource_status == 'ACTIVE'

            # NOTE: Do NOT change company.plan here.
            # BILLING.SUBSCRIPTION.ACTIVATED fires the moment the user clicks
            # "Agree & Subscribe" on the PayPal review page — before any payment
            # is processed. Plan changes are handled exclusively in
            # _handle_subscription_payment (BILLING.SUBSCRIPTION.PAYMENT.COMPLETED)
            # so the plan only updates once actual money is confirmed.

            # On activation, cancel the previous subscription that was held in cache
            # (deferred from PayPalSubscribeView). We cancel it here — not at payment
            # time — to prevent the old subscription from billing again at its next
            # renewal (which coincides with the new subscription's start_time).
            # This applies to both upgrades and deferred downgrades.
            if is_activation and subscription_id:
                prev_sub_id = cache.get(f"paypal:prev_sub:{subscription_id}")
                if prev_sub_id:
                    _cancel_result = cancel_subscription(prev_sub_id)
                    if _cancel_result.get('success'):
                        logger.info(
                            f"Cancelled previous subscription {prev_sub_id} after activation "
                            f"of {subscription_id} for company {company.id}"
                        )
                    else:
                        logger.warning(
                            f"Failed to cancel previous subscription {prev_sub_id} for "
                            f"company {company.id}: {_cancel_result.get('error')}"
                        )
                    cache.delete(f"paypal:prev_sub:{subscription_id}")

            if is_activation and not company.is_subscription_active:
                company.is_subscription_active = True
                update_fields.append('is_subscription_active')

            if update_fields:
                company.save(update_fields=update_fields)

            logger.info(
                f"Subscription lifecycle event processed for company {company.id}: "
                f"subscription={subscription_id}, event={event_type}, plan={company.plan}, "
                f"deferred_downgrade_skipped={is_deferred_downgrade}"
            )
            return Response(status=200)
        
        except Exception as e:
            logger.error(f"Error handling subscription lifecycle event: {str(e)}")
            return Response(status=200)
    
    def _handle_subscription_payment(self, data):
        """Handle successful subscription payment."""
        try:
            company = self._get_company_for_event(data)
            if not company:
                logger.warning("Company not found for subscription payment webhook")
                return Response(status=200)

            subscription_id = self._extract_subscription_id(data)
            update_fields = []
            if subscription_id and company.paypal_subscription_id != subscription_id:
                company.paypal_subscription_id = subscription_id
                update_fields.append('paypal_subscription_id')

            if not company.is_subscription_active:
                company.is_subscription_active = True
                update_fields.append('is_subscription_active')

            if subscription_id:
                from django.utils import timezone as _tz_pay
                plan_tier, _ = get_paypal_plan_tier(subscription_id)
                # Don't switch to the deferred plan early — the billing period must
                # have elapsed first.  (Normally the payment won't fire until the
                # start_time, but this guard defends against edge cases.)
                is_deferred_pay = (
                    plan_tier
                    and company.pending_downgrade_plan == plan_tier
                    and company.subscription_ends_at
                    and company.subscription_ends_at > _tz_pay.now()
                )
                if plan_tier and company.plan != plan_tier and not is_deferred_pay:
                    old_plan = company.plan
                    company.plan = plan_tier
                    update_fields.append('plan')
                    # 📋 AUDIT LOG: Plan updated via payment webhook
                    logger.info(
                        f"AUDIT: Plan updated via PayPal payment - Company: {company.id}, "
                        f"Plan: {old_plan} → {plan_tier}"
                    )
                # Billing has started for the new plan — clear pending downgrade tracking
                # only once the deferred period has elapsed.
                if company.pending_downgrade_plan and not is_deferred_pay:
                    company.pending_downgrade_plan = ''
                    company.subscription_ends_at = None
                    if 'pending_downgrade_plan' not in update_fields:
                        update_fields.extend(['pending_downgrade_plan', 'subscription_ends_at'])

            if update_fields:
                company.save(update_fields=update_fields)

            logger.info(f"Subscription payment processed for company {company.id}")
            
            return Response(status=200)
        
        except Exception as e:
            logger.error(f"Error handling subscription payment: {str(e)}")
            return Response(status=200)
    
    def _handle_subscription_failed(self, data):
        """Handle failed subscription payment."""
        try:
            company = self._get_company_for_event(data)
            if company:
                logger.warning(f"Subscription payment failed for company {company.id}")
            return Response(status=200)
        
        except Exception as e:
            logger.error(f"Error handling subscription failed: {str(e)}")
            return Response(status=200)
    
    def _handle_subscription_cancelled(self, data):
        """Handle subscription cancellation."""
        try:
            from django.utils import timezone as tz
            company = self._get_company_for_event(data)
            if company:
                subscription_id = self._extract_subscription_id(data)

                # If this subscription was awaiting user approval (stored in cache
                # from PayPalSubscribeView), the user cancelled during the PayPal
                # checkout flow before completing payment. Restore the company to
                # its prior subscription state instead of downgrading the plan.
                if subscription_id:
                    prev_sub_id = cache.get(f"paypal:prev_sub:{subscription_id}")
                    if prev_sub_id:
                        company.paypal_subscription_id = prev_sub_id
                        company.pending_downgrade_plan = ''
                        company.subscription_ends_at = None
                        company.save(update_fields=[
                            'paypal_subscription_id', 'pending_downgrade_plan',
                            'subscription_ends_at',
                        ])
                        cache.delete(f"paypal:prev_sub:{subscription_id}")
                        logger.info(
                            f"AUDIT: Subscription cancelled before approval - Company: {company.id}, "
                            f"Restored prior subscription {prev_sub_id}, cleared pending downgrade. "
                            f"Cancelled new sub: {subscription_id}"
                        )
                        return Response(status=200)

                # If the cancelled subscription is not the company's current one, it was
                # the old subscription cancelled by the ACTIVATED webhook handler after a
                # successful plan switch. Ignore this event — acting on it would
                # incorrectly downgrade an already-upgraded account.
                if (
                    subscription_id
                    and company.paypal_subscription_id
                    and subscription_id != company.paypal_subscription_id
                ):
                    logger.info(
                        f"Ignoring CANCELLED webhook for replaced subscription {subscription_id} "
                        f"(company {company.id} now has {company.paypal_subscription_id})"
                    )
                    return Response(status=200)

                update_fields = []

                # If a deferred downgrade is pending and the billing period hasn't ended yet,
                # keep the current plan active — the user paid for this period.
                if company.pending_downgrade_plan and company.subscription_ends_at and company.subscription_ends_at > tz.now():
                    if update_fields:
                        company.save(update_fields=update_fields)
                    logger.info(
                        f"AUDIT: Subscription cancelled webhook received for company {company.id} — "
                        f"deferred downgrade to {company.pending_downgrade_plan} on {company.subscription_ends_at}, "
                        f"plan kept active until then."
                    )
                    return Response(status=200)

                old_plan = company.plan
                company.is_subscription_active = False
                company.plan = company.pending_downgrade_plan or 'STARTER'
                company.pending_downgrade_plan = ''
                company.subscription_ends_at = None
                update_fields.extend(['is_subscription_active', 'plan', 'pending_downgrade_plan', 'subscription_ends_at'])
                company.save(update_fields=update_fields)
                
                # 📋 AUDIT LOG: Subscription cancelled via webhook
                logger.info(
                    f"AUDIT: Subscription cancelled via webhook - Company: {company.id}, "
                    f"Plan downgrade: {old_plan} → {company.plan}"
                )
            return Response(status=200)
        
        except Exception as e:
            logger.error(f"Error handling subscription cancelled: {str(e)}")
            return Response(status=200)
    
    def _handle_subscription_ended(self, data):
        """Handle subscription end of term."""
        return self._handle_subscription_cancelled(data)


@method_decorator(csrf_exempt, name='dispatch')
class PayPalConfirmView(APIView):
    """
    Confirm PayPal subscription after customer returns from approval flow.
    """
    permission_classes = [IsAuthenticated, IsAccountAdmin]

    def post(self, request):
        subscription_id = request.data.get('subscription_id')
        if not subscription_id:
            logger.error(f"Missing subscription_id in request: {request.data}")
            return Response(
                {'error': 'Missing subscription_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        company = user.company if hasattr(user, 'company') else None
        
        if not company:
            logger.error(f"User {user.id} has no company")
            return Response(
                {'error': 'User company not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Refresh company from database to get latest paypal_subscription_id
        company.refresh_from_db()
        stored_id = company.paypal_subscription_id or ''

        logger.info(
            f"PAYPAL CONFIRM | company={company.id} | stored_sub='{stored_id}' | "
            f"received_sub='{subscription_id}' | current_plan={company.plan}"
        )
        
        if not stored_id:
            logger.warning(
                f"No stored subscription_id for company {company.id}. This may indicate the subscription creation didn't complete."
            )
            # Still proceed to verify with PayPal in case it was created but not saved
            plan_tier, subscription_status = get_paypal_plan_tier(subscription_id)
            logger.info(
                f"PAYPAL CONFIRM (no stored id) | company={company.id} | "
                f"paypal_status={subscription_status} | plan_tier={plan_tier} | "
                f"current_db_plan={company.plan} | NOTE: plan will NOT change here"
            )
            if plan_tier and subscription_status == 'ACTIVE':
                from django.utils import timezone as _tz_fb_confirm
                _is_deferred_fb = (
                    company.pending_downgrade_plan == plan_tier
                    and company.subscription_ends_at
                    and company.subscription_ends_at > _tz_fb_confirm.now()
                )
                # Save the subscription_id and mark active. Do NOT change the plan
                # here — ACTIVE means the user approved, not that payment was charged.
                # Plan is updated exclusively in _handle_subscription_payment when
                # BILLING.SUBSCRIPTION.PAYMENT.COMPLETED is received.
                company.paypal_subscription_id = subscription_id
                company.is_subscription_active = True
                save_fields = ['paypal_subscription_id', 'is_subscription_active']
                company.save(update_fields=save_fields)

                logger.info(
                    f"AUDIT: Subscription approved (payment pending) - Company: {company.id}, "
                    f"Pending plan: {plan_tier}, Subscription ID: {subscription_id}, "
                    f"Confirmed by: {user.email}"
                )

                return Response(
                    {
                        'success': True,
                        'plan': company.plan,
                        'pending_plan': plan_tier if not _is_deferred_fb else None,
                        'target_plan': plan_tier if _is_deferred_fb else None,
                        'subscription_status': subscription_status,
                        'deferred_downgrade': _is_deferred_fb,
                    },
                    status=status.HTTP_200_OK
                )
            return Response(
                {
                    'success': False,
                    'subscription_status': subscription_status,
                    'error': 'Unable to verify subscription with PayPal'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if stored_id != subscription_id:
            logger.warning(
                f"Subscription mismatch for company {company.id}: "
                f"stored='{stored_id}', received='{subscription_id}'"
            )
            return Response(
                {'error': f'Subscription mismatch: expected {stored_id}, got {subscription_id}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        plan_tier, subscription_status = get_paypal_plan_tier(subscription_id)
        logger.info(
            f"PAYPAL CONFIRM | company={company.id} | "
            f"paypal_status={subscription_status} | plan_tier={plan_tier} | "
            f"current_db_plan={company.plan} | NOTE: plan will NOT change here"
        )
        if not plan_tier:
            # PayPal tier lookup failed (timeout or sandbox flakiness).
            # Return 202 so the frontend shows a "still verifying" message.
            # The webhook will update the plan when PayPal delivers the event.
            return Response(
                {
                    'success': False,
                    'subscription_status': subscription_status or 'UNKNOWN',
                    'error': 'Subscription is still being verified. Your plan will update automatically — please wait a moment and refresh.',
                },
                status=status.HTTP_202_ACCEPTED
            )

        if subscription_status != 'ACTIVE':
            return Response(
                {
                    'success': False,
                    'subscription_status': subscription_status,
                    'error': 'Subscription is not active yet'
                },
                status=status.HTTP_202_ACCEPTED
            )

        from django.utils import timezone as _tz_confirm
        _is_deferred_confirm = (
            company.pending_downgrade_plan == plan_tier
            and company.subscription_ends_at
            and company.subscription_ends_at > _tz_confirm.now()
        )
        update_fields = []

        # Do NOT change company.plan here. ACTIVE means the user clicked
        # "Agree & Subscribe" on the PayPal review page — the payment may not
        # have been charged yet (deferred billing, setup fees still processing,
        # or immediate billing in flight). Plan is updated exclusively in
        # _handle_subscription_payment (BILLING.SUBSCRIPTION.PAYMENT.COMPLETED).
        if company.plan != plan_tier and not _is_deferred_confirm:
            logger.info(
                f"AUDIT: Subscription approved (payment pending) - Company: {company.id}, "
                f"plan change {company.plan} → {plan_tier} pending BILLING.SUBSCRIPTION.PAYMENT.COMPLETED, "
                f"Confirmed by: {user.email}"
            )
        elif _is_deferred_confirm:
            logger.info(
                f"Deferred downgrade confirmed for company {company.id}: "
                f"plan stays {company.plan} until {company.subscription_ends_at}, "
                f"then switches to {plan_tier}"
            )

        if not company.is_subscription_active:
            company.is_subscription_active = True
            update_fields.append('is_subscription_active')

        if update_fields:
            company.save(update_fields=update_fields)

        return Response(
            {
                'success': True,
                'plan': company.plan,
                'pending_plan': plan_tier if not _is_deferred_confirm else None,
                'target_plan': plan_tier if _is_deferred_confirm else None,
                'subscription_status': subscription_status,
                'deferred_downgrade': _is_deferred_confirm,
            },
            status=status.HTTP_200_OK
        )


class PayPalWebhookDebugView(APIView):
    """
    Debug-only endpoint (superuser required) that returns:
    - The last 20 PayPal webhook events stored in cache.
    - The company's current plan / subscription state from the DB.

    GET /payments/webhooks/debug/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response({'error': 'Superuser access required'}, status=403)

        recent_webhooks = cache.get('paypal:webhook:recent', [])

        company_info = None
        if hasattr(request.user, 'company') and request.user.company:
            c = request.user.company
            c.refresh_from_db()
            company_info = {
                'id': c.id,
                'plan': c.plan,
                'is_subscription_active': c.is_subscription_active,
                'paypal_subscription_id': c.paypal_subscription_id,
                'pending_downgrade_plan': c.pending_downgrade_plan,
                'subscription_ends_at': (
                    c.subscription_ends_at.isoformat() if c.subscription_ends_at else None
                ),
            }

        return Response({
            'company': company_info,
            'recent_webhooks': recent_webhooks,
            'note': (
                'recent_webhooks shows the last ≤20 events received by /payments/webhook/. '
                'Plan changes are ONLY triggered by BILLING.SUBSCRIPTION.PAYMENT.COMPLETED. '
                'ACTIVATED = user approved on PayPal (no payment yet). '
                'PAYMENT.COMPLETED = money charged by PayPal.'
            ),
        })


# Keep old PayFast views for backward compatibility (deprecated)
class PayFastCheckoutView(APIView):
    """
    DEPRECATED: Use PayPalSubscribeView instead.
    Kept for backward compatibility.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.warning("PayFastCheckoutView is deprecated. Use PayPalSubscribeView instead.")
        return Response({'error': 'PayFast is no longer supported. Please use PayPal.'}, status=410)
    