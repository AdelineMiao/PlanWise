import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../Services/openAIservice';

function PaymentSuccess({ updateMembership }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('Verifying payment...');

  useEffect(() => {
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setStatus('Missing Stripe session ID.');
      return;
    }

    let cancelled = false;

    api.verifyCheckoutSession(sessionId)
      .then((data) => {
        if (cancelled) return;

        if (data.verified && data.plan) {
          updateMembership(data.plan);
          setStatus('Payment verified. Your PlanWise membership is active.');
          window.setTimeout(() => navigate('/smart-event-entry'), 1200);
        } else {
          setStatus('Payment is not complete yet.');
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus(error.response?.data?.error || 'Could not verify the Stripe session.');
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, params, updateMembership]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="text-4xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">PlanWise Checkout</h1>
        <p className="mt-3 text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default PaymentSuccess;
