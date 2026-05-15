import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../axios_instance';
import { useCompany } from '../context/CompanyContext';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const { refreshCompany } = useCompany();
  const [state, setState] = useState({
    loading: true,
    success: false,
    message: 'Verifying your subscription... Please wait.',
    plan: null,
    subscriptionStatus: null,
  });

  const subscriptionId = useMemo(
    () => searchParams.get('subscription_id') || searchParams.get('token') || '',
    [searchParams]
  );

  useEffect(() => {
    const confirmSubscription = async () => {
      if (!subscriptionId) {
        setState({
          loading: false,
          success: false,
          message: 'Missing subscription details. Please contact support if you were charged.',
          plan: null,
          subscriptionStatus: null,
        });
        return;
      }

      try {
        const response = await api.post('/payments/confirm/', {
          subscription_id: subscriptionId,
        });

        if (response.data?.success) {
          await refreshCompany();
          setState({
            loading: false,
            success: true,
            message: 'Payment successful. Your plan has been upgraded.',
            plan: response.data.plan || null,
            subscriptionStatus: response.data.subscription_status || null,
          });
          return;
        }

        setState({
          loading: false,
          success: false,
          message: response.data?.error || 'Subscription confirmation is still pending.',
          plan: null,
          subscriptionStatus: response.data?.subscription_status || null,
        });
      } catch (err) {
        const apiError = err.response?.data?.error;
        const pendingStatus = err.response?.data?.subscription_status;

        setState({
          loading: false,
          success: false,
          message: apiError || 'Failed to confirm your payment. Please try again shortly.',
          plan: null,
          subscriptionStatus: pendingStatus || null,
        });
      }
    };

    confirmSubscription();
  }, [subscriptionId, refreshCompany]);

  return (
    <div className="upgrade-container">
      <div className="upgrade-header mt-10">
        <h1>{state.success ? 'Subscription Active' : 'Payment Verification'}</h1>
        <p>{state.loading ? 'Checking with PayPal...' : state.message}</p>
        {state.plan && <p>Your active tier: <strong>{state.plan}</strong></p>}
        {state.subscriptionStatus && (
          <p>PayPal status: <strong>{state.subscriptionStatus}</strong></p>
        )}
      </div>

      <div className="payment-info">
        <h3>Next Steps</h3>
        <ul>
          <li>Plan limits update automatically after confirmation.</li>
          <li>Open your dashboard to continue working.</li>
          <li>If status is pending, wait a minute and retry this page.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
        <Link className="btn-upgrade" to="/bookings">Go to Dashboard</Link>
        <Link className="btn-upgrade btn-current" to="/plans">Back to Plans</Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
