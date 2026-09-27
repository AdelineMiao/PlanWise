import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function MembershipSelection({ updateMembership }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'Free',
      description: 'Calendar and journal for building your routine history.',
      features: [
        'AI calendar assistant',
        'Daily journal',
        'Calendar conflict visibility',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$5',
      period: 'month',
      description: 'Personalized daily planning after the 7-day learning period.',
      features: [
        'Everything in Basic',
        'Today Plan AI suggestions',
        'Automatic open-slot scheduling',
        'Journal-informed task recommendations',
      ],
      recommended: true,
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: '$80',
      period: 'one-time',
      description: 'One payment for the full PlanWise experience.',
      features: [
        'Everything in Premium',
        'No recurring payment',
        'Future PlanWise updates',
      ],
    },
  ];

  const handleContinue = () => {
    if (!selectedPlan) return;

    if (selectedPlan === 'basic') {
      updateMembership('basic');
      navigate('/smart-event-entry');
      return;
    }

    updateMembership(selectedPlan);
    navigate('/payment');
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-semibold text-indigo-600">Membership</p>
          <h1 className="mt-2 text-4xl font-extrabold text-gray-900">Choose how PlanWise learns with you</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            The journal and calendar form the foundation. Premium turns that history into personalized Today Plans.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border bg-white p-6 shadow-sm ${
                plan.recommended ? 'border-indigo-500' : 'border-gray-200'
              }`}
            >
              {plan.recommended && (
                <span className="absolute right-5 top-5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                  Recommended
                </span>
              )}

              <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
              <p className="mt-3 min-h-16 text-sm text-gray-500">{plan.description}</p>
              <p className="mt-6">
                <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                {plan.period && <span className="ml-1 text-sm text-gray-500">/ {plan.period}</span>}
              </p>

              <button
                className={`mt-6 w-full rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  selectedPlan === plan.id
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {selectedPlan === plan.id ? 'Selected' : 'Select'}
              </button>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            className={`btn btn-primary px-8 py-3 ${!selectedPlan ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={handleContinue}
            disabled={!selectedPlan}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default MembershipSelection;
