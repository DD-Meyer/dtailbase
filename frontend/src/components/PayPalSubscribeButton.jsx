import { useCallback, useRef, useState } from 'react';
import api from '../axios_instance';
import { showToast } from '../utils/uiFeedback';
import '../styles/PayPalSubscribeButton.css';

function loadOnsiteEngine(src) {
  if (window.payfast_do_onsite_payment) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => (window.payfast_do_onsite_payment ? resolve() : reject(new Error('engine missing')));
    script.onerror = () => reject(new Error('engine failed to load'));
    document.head.appendChild(script);
  });
}

const PayPalSubscribeButton = ({
  planId,
  onSuccess,
  onError,
  disabled = false,
  buttonLabel = 'Upgrade via PayFast',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const submitting = useRef(false);

  const handleCreateSubscription = useCallback(async () => {
    if (submitting.current || disabled) return;
    submitting.current = true;
    setLoading(true);
    setError(null);

    try {
      // Ask the backend for a signed PayFast checkout (onsite modal, redirect fallback).
      const response = await api.post('/payments/subscribe/', {
        plan_id: planId,
        mode: 'onsite',
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create subscription');
      }

      if (response.data.scheduled && response.data.redirect_url) {
        if (onSuccess) onSuccess(response.data);
        window.location.href = response.data.redirect_url;
        return response.data.subscription_id || null;
      }

      if (response.data.onsite_uuid) {
        try {
          await loadOnsiteEngine(response.data.onsite_engine_url);
          if (onSuccess) onSuccess(response.data);
          window.payfast_do_onsite_payment(
            { uuid: response.data.onsite_uuid, return_url: response.data.return_url, cancel_url: response.data.cancel_url },
            (completed) => {
              if (completed === true) window.location.href = response.data.return_url;
            },
          );
          return response.data.subscription_id || null;
        } catch (onsiteErr) {
          console.warn('PayFast onsite unavailable, using redirect', onsiteErr);
        }
      }

      if (!response.data.approval_url) {
        throw new Error('PayFast did not provide a checkout link. Please try again.');
      }
      if (onSuccess) onSuccess(response.data);
      window.location.href = response.data.approval_url;

      return response.data.subscription_id || null;
    } catch (err) {
      console.error('Subscription creation error:', err);
      
      let errorMsg = 'Failed to process subscription';
      
      // Check for specific error codes and reasons
      if (err.response?.status === 403) {
        errorMsg = 'Only account owners can upgrade plans. Please contact your account owner to upgrade.';
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      showToast(errorMsg, 'error');
      if (onError) onError(errorMsg);
      return null;
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }, [planId, onError, onSuccess, disabled]);

  return (
    <div className="paypal-subscribe-button-wrapper">
      {error && (
        <div className="error-message" role="alert">
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="loading-spinner" role="status">
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
