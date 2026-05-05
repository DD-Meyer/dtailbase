import hashlib
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from urllib.parse import quote_plus
from core.models import Company
from core.plan_limits import PLAN_CONFIG
import logging
from django.utils import timezone

class PayFastCheckoutView(APIView):
    domain = os.environ.get('PUBLIC_BASE_URL', 'https://www.detely.com').rstrip('/')
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        user = request.user
        company = user.company 

        # Pricing Logic
        prices = {'PRO': 499.00, 'ENTERPRISE': 1250.00}
        amount = prices.get(plan_id, 0)

        if amount == 0:
            return Response({"error": "Invalid plan selected"}, status=400)

        print(f"Initiating PayFast checkout for {company.name} - Plan: {plan_id} - Amount: {amount}")

        # 1. Define the data dictionary with your SPECIFIC credentials
        payfast_data = {
            'merchant_id': '10046653',
            'merchant_key': 'jimoq05d18jep',
            'return_url': f"{self.domain}/payment-success",
            'cancel_url': f"{self.domain}/upgrade",
            'notify_url': f"{self.domain}/api/payments/itn/", # Use ngrok for local testing
            'name_first': user.first_name or "User",
            'email_address': user.email,
            'm_payment_id': f"{company.id}_{plan_id}",
            'amount': f"{amount:.2f}",
            'item_name': f"Detely {plan_id} Subscription",
            'subscription_type': '1',             # 1 = Subscription
            'billing_date': timezone.now().strftime('%Y-%m-%d'), 
            'recurring_amount': f"{amount:.2f}",
            'frequency': '3',                     # 3 = Monthly
            'cycles': '0',
        }

        print("Constructed PayFast data:", payfast_data)

        # 2. Construct the Signature String
        # RULE: Join all non-empty key=value pairs with '&'
        # IMPORTANT: Do NOT URL-encode the values here.
        payload_parts = []
        for key, value in payfast_data.items():
            if value:
                # quote_plus turns "Detely PRO" into "Detely+PRO"
                payload_parts.append(f"{key}={quote_plus(str(value))}")

        # 2. Join them with '&'
        pf_param_string = "&".join(payload_parts)

        # 3. Print this to your console to verify it looks like:
        # item_name=Detely+PRO+Subscription
        print(f"DEBUG: Final Signature String: {pf_param_string}")

        # 4. Generate the MD5
        signature = hashlib.md5(pf_param_string.encode('utf-8')).hexdigest()
        payfast_data['signature'] = signature

        print("Generated signature:", signature)
        print("Final PayFast data with signature:", payfast_data)

        return Response({
            "url": "https://sandbox.payfast.co.za/eng/process",
            "params": payfast_data
        })
    

logger = logging.getLogger(__name__)

class PayFastITNView(APIView):
    # CRITICAL: Keep these empty so PayFast can POST to your server
    permission_classes = [] 
    authentication_classes = [] 

    def post(self, request):
        data = request.data.copy() # PayFast sends data as a QueryDict/Dict
        token = data.get('token') # This is the token for future recurring payments, if you want to save it.
        
        # 1. Extract the signature sent by PayFast
        received_signature = data.pop('signature', None)
        if not received_signature:
            logger.warning("ITN received without signature.")
            return Response(status=400)

        # 2. Verify the Signature
        # We must re-calculate the hash of the data sent to us to ensure it's actually from PayFast
        payload_parts = []
        for key, value in data.items():
            if value:
                # PayFast documentation: use quote_plus for spaces (+)
                from urllib.parse import quote_plus
                payload_parts.append(f"{key}={quote_plus(str(value))}")
        
        # Add your Passphrase if you have one in the PayFast dashboard
        # payload_parts.append(f"passphrase={quote_plus('YOUR_PASSPHRASE')}")
        
        pf_param_string = "&".join(payload_parts)
        generated_signature = hashlib.md5(pf_param_string.encode('utf-8')).hexdigest()

        if received_signature != generated_signature:
            logger.error(f"ITN Signature Mismatch! Possible fraud attempt. Received: {received_signature}")
            # Even if it fails, we usually return 200 to stop PayFast from retrying a "bad" request
            return Response(status=200)

        # 3. Process the Payment
        payment_status = data.get('payment_status')
        m_payment_id = data.get('m_payment_id') # "uuid_PLAN"
        token = data.get('token') # This is the token for future recurring payments, if you want to save it.

        if payment_status == 'COMPLETE':
            try:
                company_id, new_plan = m_payment_id.split('_')
                company = Company.objects.get(id=company_id)
                
                # Update Company status
                company.plan = new_plan
                company.is_subscription_active = True

                # Store the token for future automated payments
                if token:
                    company.payfast_token = token
                
                # This save() call will also trigger your enforce_plan_limits() 
                # inside the Company model automatically.
                company.save()
                
                logger.info(f"PAYMENT SUCCESS: Company {company.name} upgraded to {new_plan}")
                
            except Company.DoesNotExist:
                logger.error(f"ITN Error: Company {company_id} not found.")
            except Exception as e:
                logger.error(f"ITN Processing Error: {str(e)}")
        
        # PayFast expects a 200 OK to acknowledge receipt
        return Response(status=200)
    