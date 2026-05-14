import os
import logging
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from core.models import Company
from payments.geolocation import detect_user_currency
from payments.paypal_service import (
    create_paypal_subscription, 
    get_subscription_plan,
    get_paypal_plan_tier,
    get_paypal_tier_from_plan_id,
    cancel_subscription,
    verify_paypal_webhook,
    PRICING
)

logger = logging.getLogger(__name__)


class PricingView(APIView):
    """
    Get pricing based on user's detected country/currency.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            from core.plan_limits import PLAN_CONFIG

            # Helper to convert float('inf') to string for JSON
            def safe_plan(plan):
                return {
                    k: ("unlimited" if isinstance(v, float) and v == float('inf') else v)
                    for k, v in plan.items()
                }

            # Detect user's country and currency from IP
            country_code, currency = detect_user_currency(request)

            # For authenticated users, keep company currency aligned with detected preference.
            if request.user.is_authenticated and hasattr(request.user, 'company') and request.user.company:
                company = request.user.company
                update_fields = []
                if company.country_code != country_code:
                    company.country_code = country_code
                    update_fields.append('country_code')
                if company.currency != currency:
                    company.currency = currency
                    update_fields.append('currency')
                if update_fields:
                    company.save(update_fields=update_fields)

            # Get pricing for this currency
            pricing = PRICING.get(currency, PRICING['USD'])

            # Build plans with features and pricing
            plans = {}
            for plan_name in PLAN_CONFIG:
                plan_features = safe_plan(PLAN_CONFIG[plan_name])
                if plan_name == 'STARTER':
                    price = '0'
                else:
                    price = pricing[plan_name]['amount']
                plans[plan_name] = {
                    'features': plan_features,
                    'price': price,
                    'currency': currency,
                }

            return Response({
                'country_code': country_code,
                'currency': currency,
                'pricing': pricing,
                'plans': plans
            })
        except Exception as e:
            logger.error(f"Error in PricingView: {str(e)}")
            return Response({'error': str(e)}, status=500)


class PayPalSubscribeView(APIView):
    """
    Initiate a PayPal subscription.
    Called when user clicks the upgrade button.
    """
    permission_classes = [IsAuthenticated]
    
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
            
            # Get user's currency
            currency = company.currency or 'USD'
            
            # Get pricing
            plan_details = get_subscription_plan(plan_id, currency)
            if not plan_details:
                return Response({'error': 'Plan not available for this currency'}, status=400)
            
            # Generate return/cancel URLs
            domain = os.environ.get('PUBLIC_BASE_URL', 'https://www.dtailbase.com').rstrip('/')
            return_url = f"{domain}/payment-success?plan={plan_id}"
            cancel_url = f"{domain}/plans"
            
            logger.info(f"Creating PayPal subscription: user={user.email}, plan={plan_id}, currency={currency}")
            
            # Create PayPal subscription
            result = create_paypal_subscription(
                user_email=user.email,
                plan_id=plan_id,
                currency=currency,
                return_url=return_url,
                cancel_url=cancel_url
            )
            
            if result['success']:
                # Store pending subscription info in company
                company.paypal_subscription_id = result.get('subscription_id', '')
                company.save(update_fields=['paypal_subscription_id'])
                
                return Response({
                    'success': True,
                    'approval_url': result['approval_url'],
                    'subscription_id': result.get('subscription_id'),
                    'amount': plan_details['amount'],
                    'currency': currency
                })
            else:
                error_msg = result.get('error', 'Failed to create subscription')
                logger.error(f"Failed to create subscription: {error_msg}")
                return Response({
                    'error': error_msg
                }, status=500)
        
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in PayPalSubscribeView: {error_msg}", exc_info=True)
            return Response({'error': error_msg}, status=500)


class PayPalCancelSubscriptionView(APIView):
    """Cancel the active PayPal subscription to allow downgrade actions."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            if not hasattr(user, 'company') or not user.company:
                return Response({'error': 'User company not found'}, status=400)

            company = user.company
            subscription_id = company.paypal_subscription_id
            if not subscription_id:
                return Response({'error': 'No active PayPal subscription found'}, status=400)

            cancel_result = cancel_subscription(subscription_id)
            if not cancel_result.get('success'):
                return Response(
                    {'error': cancel_result.get('error') or 'Failed to cancel PayPal subscription'},
                    status=502
                )

            # Apply immediate local downgrade state while webhook reconciliation completes.
            company.is_subscription_active = False
            company.plan = 'STARTER'
            company.paypal_subscription_id = ''
            company.save(update_fields=['is_subscription_active', 'plan', 'paypal_subscription_id'])

            return Response({
                'success': True,
                'message': cancel_result.get('message') or 'Subscription cancelled on PayPal. Any penalties due are handled by PayPal billing terms.',
                'plan': company.plan,
            }, status=200)
        except Exception as e:
            logger.error(f"Error in PayPalCancelSubscriptionView: {str(e)}", exc_info=True)
            return Response({'error': 'Unable to cancel subscription right now'}, status=500)


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

            if plan_tier and company.plan != plan_tier:
                company.plan = plan_tier
                update_fields.append('plan')

            should_activate = event_type == 'BILLING.SUBSCRIPTION.ACTIVATED' or resource_status == 'ACTIVE'
            if should_activate and not company.is_subscription_active:
                company.is_subscription_active = True
                update_fields.append('is_subscription_active')

            if update_fields:
                company.save(update_fields=update_fields)

            logger.info(
                f"Subscription lifecycle event processed for company {company.id}: "
                f"subscription={subscription_id}, event={event_type}, plan={company.plan}"
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
                plan_tier, _ = get_paypal_plan_tier(subscription_id)
                if plan_tier and company.plan != plan_tier:
                    company.plan = plan_tier
                    update_fields.append('plan')

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
            company = self._get_company_for_event(data)
            if company:
                subscription_id = self._extract_subscription_id(data)
                update_fields = []

                if subscription_id and company.paypal_subscription_id != subscription_id:
                    company.paypal_subscription_id = subscription_id
                    update_fields.append('paypal_subscription_id')

                company.is_subscription_active = False
                company.plan = 'STARTER'  # Downgrade to starter
                update_fields.extend(['is_subscription_active', 'plan'])
                company.save(update_fields=update_fields)
                logger.info(f"Subscription cancelled for company {company.id}")
            return Response(status=200)
        
        except Exception as e:
            logger.error(f"Error handling subscription cancelled: {str(e)}")
            return Response(status=200)
    
    def _handle_subscription_ended(self, data):
        """Handle subscription end of term."""
        return self._handle_subscription_cancelled(data)


class PayPalConfirmView(APIView):
    """
    Confirm PayPal subscription after customer returns from approval flow.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        subscription_id = request.data.get('subscription_id')
        if not subscription_id:
            return Response(
                {'error': 'Missing subscription_id'},
                status=status.HTTP_400_BAD_REQUEST
            )

        company = request.user.company
        if not company:
            return Response(
                {'error': 'User company not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if company.paypal_subscription_id != subscription_id:
            logger.warning(
                f"Subscription mismatch for company {company.id}: "
                f"stored={company.paypal_subscription_id}, received={subscription_id}"
            )
            return Response(
                {'error': 'Subscription mismatch'},
                status=status.HTTP_400_BAD_REQUEST
            )

        plan_tier, subscription_status = get_paypal_plan_tier(subscription_id)
        if not plan_tier:
            return Response(
                {
                    'success': False,
                    'subscription_status': subscription_status,
                    'error': 'Unable to verify subscription tier'
                },
                status=status.HTTP_400_BAD_REQUEST
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

        update_fields = []
        if company.plan != plan_tier:
            company.plan = plan_tier
            update_fields.append('plan')

        if not company.is_subscription_active:
            company.is_subscription_active = True
            update_fields.append('is_subscription_active')

        if update_fields:
            company.save(update_fields=update_fields)

        return Response(
            {
                'success': True,
                'plan': company.plan,
                'subscription_status': subscription_status
            },
            status=status.HTTP_200_OK
        )


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
    