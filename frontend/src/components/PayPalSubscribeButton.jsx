import { useCallback, useState } from 'react';
import api from '../axios_instance';
import '../styles/PayPalSubscribeButton.css';

const PayPalSubscribeButton = ({
  planId,
  onSuccess,
  onError,
  disabled = false,
  buttonLabel = 'Upgrade via PayPal',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Call backend to create PayPal subscription.
      const response = await api.post('/payments/subscribe/', {
        plan_id: planId,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create subscription');
      }

      // Redirect to PayPal approval URL
      if (response.data.approval_url) {
        if (onSuccess) onSuccess(response.data);
        window.location.href = response.data.approval_url;
      }

      return response.data.subscription_id || null;
    } catch (err) {
      console.error('Subscription creation error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to process subscription';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [planId, onError, onSuccess]);

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
          {buttonLabel}
        </button>
      )}
    </div>
  );
};

export default PayPalSubscribeButton;
