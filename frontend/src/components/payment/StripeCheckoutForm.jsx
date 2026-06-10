import React, { useEffect, useState } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import axios from 'axios';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#212529',
      fontFamily: '"Inter", "Helvetica Neue", Helvetica, sans-serif',
      '::placeholder': { color: '#adb5bd' },
      iconColor: '#635bff',
    },
    invalid: { color: '#e74c3c', iconColor: '#e74c3c' },
  },
  hidePostalCode: false,
};

const StripePaymentInner = ({
  amount,
  metadata = {},
  onSuccess,
  onError,
  disabled = false,
  payLabel,
  summary,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');
  const [processing, setProcessing] = useState(false);

  const finalAmount = Math.max(0, Number(amount) || 0);

  const handlePay = async () => {
    if (!stripe || !elements || disabled) return;

    setCardError('');
    setProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const piRes = await axios.post(
        '/api/orders/create-payment-intent',
        {
          amount: Math.round(finalAmount * 100),
          currency: 'eur',
          metadata,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        }
      );

      if (!piRes.data?.success) {
        throw new Error(piRes.data?.message || 'Could not create payment intent');
      }

      const { clientSecret } = piRes.data;
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess?.(paymentIntent, finalAmount);
      } else {
        throw new Error(`Payment status: ${paymentIntent.status}. Please try again.`);
      }
    } catch (err) {
      const message = err.message || 'Payment failed. Please try again.';
      setCardError(message);
      onError?.(message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <span
          style={{
            background: 'linear-gradient(135deg, #635bff, #8c7ef7)',
            color: '#fff',
            borderRadius: 8,
            padding: '4px 12px',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          🔒 Secured by Stripe
        </span>
        <span className="small text-muted">Your card info is encrypted</span>
      </div>

      <div
        style={{
          border: '1.5px solid #dee2e6',
          borderRadius: 10,
          padding: '14px 16px',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          marginBottom: 16,
        }}
      >
        <CardElement options={CARD_ELEMENT_OPTIONS} onChange={() => setCardError('')} />
      </div>

      {cardError && (
        <Alert variant="danger" className="py-2 small">{cardError}</Alert>
      )}

      {summary}

      <Button
        variant="success"
        className="w-100 mt-3"
        onClick={handlePay}
        disabled={!stripe || processing || disabled || finalAmount <= 0}
        style={{
          background: processing ? undefined : 'linear-gradient(135deg, #635bff, #8c7ef7)',
          border: 'none',
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {processing ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Processing…
          </>
        ) : (
          payLabel || `🔒 Pay €${finalAmount.toFixed(2)} with Stripe`
        )}
      </Button>
    </div>
  );
};

export default function StripeCheckoutForm(props) {
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setConfigError('');

    axios.get('/api/orders/stripe-config')
      .then((res) => {
        if (!active) return;
        if (res.data?.success && res.data?.publishableKey) {
          setStripePromise(loadStripe(res.data.publishableKey));
        } else {
          setConfigError('Stripe is not configured. Please add your Stripe keys in Admin Settings.');
        }
      })
      .catch(() => {
        if (active) {
          setConfigError('Could not load Stripe configuration. Make sure the backend is running.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4 text-muted">
        <Spinner animation="border" size="sm" className="me-2" />
        Loading Stripe…
      </div>
    );
  }

  if (configError) {
    return (
      <Alert variant="warning" className="mb-0">
        <strong>⚠️ Stripe not available.</strong> {configError}
      </Alert>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripePaymentInner {...props} />
    </Elements>
  );
}
