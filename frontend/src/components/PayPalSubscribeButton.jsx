import { useCallback, useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import api from '../axios_instance';
import { fetchPricingWithFallback, isValidPricingPayload } from '../services/pricingService';
import '../styles/PayPalSubscribeButton.css';

const PayPalSubscribeButton = ({ planId, onSuccess, onError, disabled = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState('USD');

  // Fetch pricing and detect currency
  const fetchPricing = useCallback(async () => {
    try {
      const response = await fetchPricingWithFallback(api, 'PayPalSubscribeButton');
      if (!isValidPricingPayload(response.data)) {
        throw new Error('Unexpected pricing payload');
      }
      const detectedCurrency = (response.data?.currency || 'USD').toUpperCase();
      const pricing = response.data?.pricing || {
        PRO: {
          amount: response.data?.plans?.PRO?.price,
          currency: response.data?.plans?.PRO?.currency || detectedCurrency,
        },
        ENTERPRISE: {
          amount: response.data?.plans?.ENTERPRISE?.price,
          currency: response.data?.plans?.ENTERPRISE?.currency || detectedCurrency,
        },
      };

      setCurrency(detectedCurrency);
      return pricing;
    } catch (err) {
      console.error('Error fetching pricing:', err);
      setError('Failed to load pricing information');
      return null;
    }
  }, []);

  const handleCreateSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get pricing first
      const pricing = await fetchPricing();
      if (!pricing) {
        throw new Error('Could not fetch pricing');
      }

      const plan = pricing[planId];
      if (!plan) {
        throw new Error(`Plan ${planId} not found for currency ${currency}`);
      }

      // Call backend to create PayPal subscription
      const response = await api.post('payments/subscribe/', {
        plan_id: planId,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create subscription');
      }

      // Redirect to PayPal approval URL
      if (response.data.approval_url) {
        window.location.href = response.data.approval_url;
      }

      return response.data.agreement_id;
    } catch (err) {
      console.error('Subscription creation error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to process subscription';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [planId, currency, fetchPricing, onError]);

  const buttonStyle = {
    layout: 'vertical',
    color: 'gold',
    shape: 'rect',
    label: 'subscribe',
  };

  return (
    <div className="paypal-subscribe-button-wrapper">
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="loading-spinner">
          <p>Processing...</p>
        </div>
      )}

      {!loading && (
        <button
          onClick={handleCreateSubscription}
          disabled={disabled || loading}
          className="btn-paypal-subscribe"
        >
          Upgrade via PayPal
        </button>
      )}
    </div>
  );
};

export default PayPalSubscribeButton;
