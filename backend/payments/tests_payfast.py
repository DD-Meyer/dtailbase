from decimal import Decimal
from unittest.mock import patch
from urllib.parse import parse_qsl, urlparse

from django.test import SimpleTestCase, override_settings

from payments import payfast_service as pf


TEST_PLANS = {
    'STARTER': {'price': 0},
    'PRO': {'price': 1800.0, 'prices': {'USD': 99.0, 'EUR': 92.0}},
    'ENTERPRISE': {'price': 3600.0, 'prices': {'USD': 199.0}},
}


@patch.object(pf, 'PLAN_CONFIG', TEST_PLANS)
@override_settings(
    PAYFAST_MODE='sandbox',
    PAYFAST_SANDBOX_MERCHANT_ID='10000100',
    PAYFAST_SANDBOX_MERCHANT_KEY='46f0cd694581a',
    PAYFAST_SANDBOX_PASSPHRASE='secret phrase',
    PAYFAST_LIVE_MERCHANT_ID='live-id',
    PAYFAST_LIVE_MERCHANT_KEY='live-key',
    PAYFAST_LIVE_PASSPHRASE='',
)
class PayFastServiceTests(SimpleTestCase):
    def _checkout(self):
        return pf.build_checkout_url(
            email='a@b.com', plan_id='PRO', m_payment_id='x_PRO_1',
            return_url='https://x/ok', cancel_url='https://x/no', notify_url='https://x/itn',
            company_id='c1',
        )

    def test_checkout_url_is_signed_subscription(self):
        url = self._checkout()
        self.assertTrue(url.startswith('https://sandbox.payfast.co.za/eng/process?'))
        params = dict(parse_qsl(urlparse(url).query))
        self.assertEqual(params['subscription_type'], '1')
        self.assertEqual(params['recurring_amount'], '1800.00')
        self.assertEqual(params['merchant_id'], '10000100')
        self.assertEqual(len(params['signature']), 32)

    @override_settings(PAYFAST_MODE='live')
    def test_live_mode_uses_live_credentials_and_url(self):
        url = self._checkout()
        self.assertTrue(url.startswith('https://www.payfast.co.za/eng/process?'))
        self.assertEqual(dict(parse_qsl(urlparse(url).query))['merchant_id'], 'live-id')

    def test_itn_signature_roundtrip(self):
        items = [('m_payment_id', 'a b'), ('payment_status', 'COMPLETE'), ('amount_gross', '1800.00')]
        sig = pf.generate_signature(dict(items), 'secret phrase')
        self.assertTrue(pf.verify_itn_signature(items + [('signature', sig)]))
        self.assertFalse(pf.verify_itn_signature(items + [('signature', 'bad')]))

    def test_pricing_from_plan_config(self):
        self.assertEqual(pf.get_plan_amount('PRO'), Decimal('1800.00'))
        url = pf.build_checkout_url(
            email='a@b.com', plan_id='PRO', m_payment_id='x', return_url='https://x/ok',
            cancel_url='https://x/no', notify_url='https://x/itn',
        )
        params = dict(parse_qsl(urlparse(url).query))
        self.assertEqual(params['recurring_amount'], '1800.00')
        self.assertNotIn('currency', params)

    def test_plan_for_amount(self):
        self.assertEqual(pf.get_plan_for_amount('1800.00'), 'PRO')
        self.assertEqual(pf.get_plan_for_amount(Decimal('3600')), 'ENTERPRISE')
        self.assertIsNone(pf.get_plan_for_amount('5.00'))

    def test_multi_currency_pricing(self):
        self.assertEqual(pf.normalize_currency('usd'), 'USD')
        self.assertEqual(pf.get_plan_amount('PRO', 'USD'), Decimal('99.00'))
        self.assertEqual(pf.get_plan_for_amount('199', 'USD'), 'ENTERPRISE')
        # Unpriced currencies fall back to ZAR
        self.assertEqual(pf.normalize_currency('GBP'), 'ZAR')
        self.assertEqual(pf.get_plan_amount('PRO', 'GBP'), Decimal('1800.00'))
        url = pf.build_checkout_url(
            email='a@b.com', plan_id='PRO', m_payment_id='x', return_url='https://x/ok',
            cancel_url='https://x/no', notify_url='https://x/itn', currency='USD',
        )
        params = dict(parse_qsl(urlparse(url).query))
        self.assertEqual(params['recurring_amount'], '99.00')
        self.assertEqual(params['currency'], 'USD')
