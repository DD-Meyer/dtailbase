"""PayFast subscription views (replaces the PayPal flow)."""

import logging
import time
import uuid
from datetime import datetime

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Company
from core.permissions import IsAccountAdmin
from payments import payfast_service as pf

logger = logging.getLogger(__name__)

PLAN_TIER = {'STARTER': 0, 'PRO': 1, 'ENTERPRISE': 2}


def _public_base():
    return (getattr(settings, 'PUBLIC_BASE_URL', '') or 'https://www.dtailbase.com').rstrip('/')


def _notify_url():
    explicit = getattr(settings, 'PAYFAST_NOTIFY_URL', '')
    return explicit or f"{_public_base()}/api/payments/payfast/notify/"


def _parse_run_date(details):
    """PayFast returns run_date as YYYY-MM-DD; treat it as end of that day."""
    raw = (details or {}).get('run_date')
    if not raw:
        return None
    dt = parse_datetime(raw)
    if dt is None:
        d = parse_date(raw[:10])
        if d is None:
            return None
        dt = datetime(d.year, d.month, d.day)
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt)
    return dt


def _split_name(user):
    full = (getattr(user, 'full_name', '') or getattr(user, 'first_name', '') or '').strip()
    parts = full.split(' ', 1)
    return parts[0], (parts[1] if len(parts) > 1 else '')


@method_decorator(csrf_exempt, name='dispatch')
class PayFastSubscribeView(APIView):
    """Start (or change) a PayFast subscription."""
    permission_classes = [IsAuthenticated, IsAccountAdmin]

    def post(self, request):
        try:
            plan_id = request.data.get('plan_id')
            user = request.user
            company = getattr(user, 'company', None)
            if not company:
                return Response({'error': 'User company not found'}, status=400)
            if plan_id not in ('PRO', 'ENTERPRISE'):
                return Response({'error': 'Invalid plan'}, status=400)
            if not pf.is_configured():
                logger.error("PayFast credentials are not configured")
                return Response({'error': 'Payments are not configured. Please contact support.'}, status=503)

            amount = pf.get_plan_amount(plan_id, company.currency)
            currency = pf.normalize_currency(company.currency)
            token = company.payfast_token
            current_plan = company.plan

            # Paid-to-paid downgrade: lower the recurring amount from the next run.
            if (token and company.is_subscription_active
                    and PLAN_TIER.get(plan_id, 0) < PLAN_TIER.get(current_plan, 0)):
                details = pf.get_subscription_details(token)
                ends_at = _parse_run_date(details)
                result = pf.update_subscription_amount(token, amount)
                if not result.get('success'):
                    return Response({'error': result.get('error')}, status=502)
                if ends_at and ends_at > timezone.now():
                    company.pending_downgrade_plan = plan_id
                    company.subscription_ends_at = ends_at
                    company.save(update_fields=['pending_downgrade_plan', 'subscription_ends_at'])
                logger.info(f"AUDIT: PayFast downgrade scheduled - Company: {company.id}, {current_plan} -> {plan_id}")
                return Response({
                    'success': True,
                    'scheduled': True,
                    'redirect_url': f"{_public_base()}/payment-success?plan={plan_id}&subscription_id="
                                    f"{self._payment_ref(company, plan_id)}",
                    'amount': f"{amount:.2f}",
                    'currency': currency,
                })

            ref = self._payment_ref(company, plan_id)
            name_first, name_last = _split_name(user)
            checkout = dict(
                email=user.email,
                plan_id=plan_id,
                m_payment_id=ref,
                return_url=f"{_public_base()}/payment-success?plan={plan_id}&subscription_id={ref}",
                cancel_url=f"{_public_base()}/plans",
                notify_url=_notify_url(),
                name_first=name_first,
                name_last=name_last,
                company_id=company.id,
                currency=currency,
            )
            url = pf.build_checkout_url(**checkout)
            if not url:
                return Response({'error': 'Unable to create PayFast checkout'}, status=500)

            onsite_uuid = pf.get_onsite_uuid(**checkout) if request.data.get('mode') == 'onsite' else None

            return Response({
                'success': True,
                'approval_url': url,
                'onsite_uuid': onsite_uuid,
                'onsite_engine_url': pf.ONSITE_ENGINE_URL[pf.get_mode()],
                'return_url': checkout['return_url'],
                'cancel_url': checkout['cancel_url'],
                'subscription_id': ref,
                'amount': f"{amount:.2f}",
                'currency': currency,
            })
        except Exception as exc:
            logger.error(f"Error in PayFastSubscribeView: {exc}", exc_info=True)
            return Response({'error': 'Unable to start subscription right now'}, status=500)

    @staticmethod
    def _payment_ref(company, plan_id):
        return f"{company.id.hex}_{plan_id}_{int(time.time())}"


@method_decorator(csrf_exempt, name='dispatch')
class PayFastCancelSubscriptionView(APIView):
    """Cancel the PayFast subscription; access continues to the paid period end."""
    permission_classes = [IsAuthenticated, IsAccountAdmin]

    def post(self, request):
        try:
            user = request.user
            company = getattr(user, 'company', None)
            if not company:
                return Response({'error': 'User company not found'}, status=400)
            token = company.payfast_token
            if not token:
                return Response({'error': 'No active subscription found'}, status=400)

            ends_at = _parse_run_date(pf.get_subscription_details(token))

            result = pf.cancel_subscription(token)
            if not result.get('success'):
                return Response({'error': result.get('error') or 'Failed to cancel subscription'}, status=502)

            old_plan = company.plan
            if ends_at and ends_at > timezone.now():
                company.pending_downgrade_plan = 'STARTER'
                company.subscription_ends_at = ends_at
                company.save(update_fields=['pending_downgrade_plan', 'subscription_ends_at'])
                logger.info(f"AUDIT: PayFast subscription cancelled (deferred) - Company: {company.id}, by {user.email}")
                return Response({
                    'success': True,
                    'message': (
                        f'Subscription cancelled. Your {old_plan} plan access continues until '
                        f'{ends_at.strftime("%d %b %Y")}, then downgrades to Starter.'
                    ),
                    'plan': company.plan,
                    'subscription_ends_at': ends_at.isoformat(),
                })

            company.is_subscription_active = False
            company.plan = 'STARTER'
            company.payfast_token = ''
            company.pending_downgrade_plan = ''
            company.subscription_ends_at = None
            company.save(update_fields=['is_subscription_active', 'plan', 'payfast_token',
                                        'pending_downgrade_plan', 'subscription_ends_at'])
            logger.info(f"AUDIT: PayFast subscription cancelled (immediate) - Company: {company.id}, by {user.email}")
            return Response({
                'success': True,
                'message': 'Subscription cancelled. Plan downgraded to Starter.',
                'plan': company.plan,
            })
        except Exception as exc:
            logger.error(f"Error in PayFastCancelSubscriptionView: {exc}", exc_info=True)
            return Response({'error': 'Unable to cancel subscription right now'}, status=500)


class PayFastBillingSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            company = getattr(request.user, 'company', None)
            if not company:
                return Response({'error': 'User company not found'}, status=400)

            company.apply_pending_downgrade_if_due()
            plan = (company.plan or 'STARTER').upper()
            pending = (company.pending_downgrade_plan or '').upper()
            if pending and pending == plan:
                company.pending_downgrade_plan = ''
                company.subscription_ends_at = None
                company.save(update_fields=['pending_downgrade_plan', 'subscription_ends_at'])
                pending = ''

            currency = pf.normalize_currency(company.currency)
            amount = pf.get_plan_amount(plan, currency)
            token = company.payfast_token or ''
            summary = {
                'plan': plan,
                'currency': currency,
                'is_subscription_active': bool(company.is_subscription_active),
                'subscription_reference': token,
                'subscription_status': 'INACTIVE',
                'billing_cycle': 'MONTHLY',
                'monthly_amount': f"{amount:.2f}" if amount is not None else '0.00',
                'next_billing_time': None,
                'last_payment': None,
                'payment_method': None,
                'cancel_available': bool(token),
                'pending_downgrade_plan': pending,
                'subscription_ends_at': company.subscription_ends_at.isoformat() if company.subscription_ends_at else None,
            }
            if not token:
                return Response(summary)

            details = pf.get_subscription_details(token)
            if not details:
                summary['subscription_status'] = 'UNKNOWN'
                return Response(summary)

            raw_status = (details.get('status_text') or details.get('status') or '').upper()
            summary['subscription_status'] = 'ACTIVE' if raw_status == 'ACTIVE' else (raw_status or 'UNKNOWN')
            summary['next_billing_time'] = details.get('run_date')
            summary['payment_method'] = {'type': 'PAYFAST', 'display': 'PayFast'}
            return Response(summary)
        except Exception as exc:
            logger.error(f"Error in PayFastBillingSummaryView: {exc}", exc_info=True)
            return Response({'error': 'Unable to load billing summary right now'}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class PayFastConfirmView(APIView):
    """Called by the return page. State is driven by the ITN; this only reports it."""
    permission_classes = [IsAuthenticated, IsAccountAdmin]

    def post(self, request):
        ref = (request.data.get('subscription_id') or '').strip()
        company = getattr(request.user, 'company', None)
        if not ref:
            return Response({'error': 'Missing subscription_id'}, status=status.HTTP_400_BAD_REQUEST)
        if not company:
            return Response({'error': 'User company not found'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            company_hex, plan_tier, _ = ref.split('_', 2)
        except ValueError:
            return Response({'error': 'Invalid payment reference'}, status=status.HTTP_400_BAD_REQUEST)
        if company_hex != company.id.hex or plan_tier not in ('PRO', 'ENTERPRISE'):
            return Response({'error': 'Payment reference does not match this account'},
                            status=status.HTTP_400_BAD_REQUEST)

        company.refresh_from_db()
        scheduled = (company.pending_downgrade_plan == plan_tier
                     and company.subscription_ends_at and company.subscription_ends_at > timezone.now())
        if scheduled:
            return Response({
                'success': True, 'plan': company.plan, 'pending_plan': plan_tier,
                'target_plan': plan_tier, 'subscription_status': 'ACTIVE', 'deferred_downgrade': True,
            })
        if company.is_subscription_active and company.payfast_token and company.plan == plan_tier:
            return Response({
                'success': True, 'plan': company.plan, 'pending_plan': None,
                'subscription_status': 'ACTIVE', 'deferred_downgrade': False,
            })
        return Response({
            'success': False, 'subscription_status': 'APPROVAL_PENDING',
            'error': 'Waiting for PayFast to confirm your payment. This can take a minute.',
        }, status=status.HTTP_202_ACCEPTED)


@method_decorator(csrf_exempt, name='dispatch')
class PayFastNotifyView(View):
    """PayFast ITN endpoint: validates, then activates/updates/cancels subscriptions."""

    def post(self, request):
        post_items = list(request.POST.items())
        data = dict(post_items)
        remote_ip = (request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
                     or request.META.get('REMOTE_ADDR', ''))

        merchant_id, _, _ = pf.get_credentials()
        if not (data.get('merchant_id') == merchant_id
                and pf.verify_itn_signature(post_items)
                and pf.verify_itn_source(remote_ip)):
            logger.warning(f"PayFast ITN rejected (signature/source/merchant) from {remote_ip}")
            return HttpResponse(status=400)
        if not pf.verify_itn_with_server(post_items):
            logger.warning("PayFast ITN rejected: server validation failed")
            return HttpResponse(status=400)

        try:
            self._process(data)
        except Exception as exc:
            logger.error(f"Error processing PayFast ITN: {exc}", exc_info=True)
            return HttpResponse(status=500)  # PayFast retries on non-200
        return HttpResponse(status=200)

    def _company(self, data):
        raw = (data.get('custom_str2') or '').strip()
        try:
            return Company.objects.filter(id=uuid.UUID(raw)).first()
        except ValueError:
            pass
        token = data.get('token')
        return Company.objects.filter(payfast_token=token).first() if token else None

    def _process(self, data):
        company = self._company(data)
        if not company:
            logger.warning(f"PayFast ITN: company not found (pf_payment_id={data.get('pf_payment_id')})")
            return

        payment_status = (data.get('payment_status') or '').upper()
        token = data.get('token') or ''

        if payment_status == 'COMPLETE':
            self._handle_complete(company, data, token)
        elif payment_status == 'CANCELLED':
            self._handle_cancelled(company, token)
        else:
            logger.info(f"PayFast ITN status {payment_status} for company {company.id}")

    def _handle_complete(self, company, data, token):
        amount = data.get('amount_gross')
        currency = (data.get('custom_str3') or '').upper() or None
        plan = pf.get_plan_for_amount(amount, currency)
        requested = (data.get('custom_str1') or '').upper()
        if not plan:
            logger.error(f"PayFast ITN amount {amount} matches no plan (company {company.id})")
            return
        expected = pf.get_plan_amount(requested, currency or 'ZAR')
        if requested in ('PRO', 'ENTERPRISE') and expected is not None \
                and not pf.amounts_match(expected, amount) \
                and company.payfast_token != token:
            logger.error(f"PayFast ITN amount mismatch for company {company.id}: {amount} vs {requested}")
            return

        previous_token = company.payfast_token
        company.payfast_token = token or previous_token
        company.is_subscription_active = True
        company.plan = plan
        company.pending_downgrade_plan = ''
        company.subscription_ends_at = None
        company.save(update_fields=['payfast_token', 'is_subscription_active', 'plan',
                                    'pending_downgrade_plan', 'subscription_ends_at'])
        logger.info(f"AUDIT: PayFast payment complete - Company: {company.id}, plan {plan}, token {token}")

        # Plan switch created a new subscription: retire the old one.
        if previous_token and token and previous_token != token:
            pf.cancel_subscription(previous_token)

    def _handle_cancelled(self, company, token):
        if token and company.payfast_token and token != company.payfast_token:
            return  # an old subscription being retired after a plan switch
        if company.subscription_ends_at and company.subscription_ends_at > timezone.now():
            company.pending_downgrade_plan = company.pending_downgrade_plan or 'STARTER'
            company.save(update_fields=['pending_downgrade_plan'])
            return
        company.is_subscription_active = False
        company.plan = 'STARTER'
        company.pending_downgrade_plan = ''
        company.subscription_ends_at = None
        company.save(update_fields=['is_subscription_active', 'plan', 'pending_downgrade_plan',
                                    'subscription_ends_at'])
        logger.info(f"AUDIT: PayFast subscription cancelled via ITN - Company: {company.id}")
