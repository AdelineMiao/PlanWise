import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../Services/openAIservice';

function PaymentPage({ membership }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const details = membership === 'lifetime'
    ? { amount: '$80', description: 'Lifetime membership', cadence: 'one-time' }
    : { amount: '$5', description: 'Premium membership', cadence: 'per month' };

  const checkout = async () => {
    if (!['premium', 'lifetime'].includes(membership)) {
      setError('Choose a paid plan first.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const session = await api.createCheckoutSession(membership);
      if (!session.url) throw new Error('Stripe did not return a checkout URL.');
      window.location.assign(session.url);
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.message || 'Checkout failed.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <button
          className="mb-6 text-sm text-primary hover:underline"
          onClick={() => navigate('/membership')}
        >
          ← Back to plans
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-indigo-600">Secure checkout</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{details.description}</h1>
          <p className="mt-3 text-gray-500">
            Unlock Today Plan after PlanWise has learned from seven journal days.
          </p>

          <div className="my-8 rounded-xl bg-gray-50 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-gray-600">PlanWise {membership}</span>
              <span className="text-2xl font-bold text-gray-900">{details.amount}</span>
            </div>
            <p className="mt-1 text-right text-xs text-gray-500">{details.cadence}</p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            className={`btn btn-primary w-full py-3 ${processing ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={checkout}
            disabled={processing}
          >
            {processing ? 'Opening Stripe...' : 'Continue to Stripe Checkout'}
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            Card details are collected by Stripe, not stored by PlanWise.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
