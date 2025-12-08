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
      priceId: null,
      description: 'Access to Smart Event Entry only',
      features: [
        'Natural language event input',
        'Basic calendar management',
        'Unlimited events',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$5',
      period: 'monthly',
      priceId: 'price_premium_monthly',
      description: 'Full access to all features',
      features: [
        'All Basic features',
        'Auto Task Scheduler',
        'Group Availability Coordination',
        'Habit-Based Recommendations',
      ],
      recommended: true,
    },
    {
      id: 'lifetime',
      name: 'Lifetime',
      price: '$80',
      period: 'one-time',
      priceId: 'price_premium_lifetime',
      description: 'Pay once, use forever',
      features: [
        'All Premium features',
        'No recurring payments',
        'Lifetime updates',
      ],
    },
  ];
  
  const handleContinue = () => {
    if (!selectedPlan) {
      return;
    }
    
    // Update the membership
    updateMembership(selectedPlan);
    
    // If basic plan, go directly to app
    if (selectedPlan === 'basic') {
      navigate('/smart-event-entry');
    } else {
      // Go to payment page for premium plans
      navigate('/payment');
    }
  };
  
  // For development purposes, bypass payment process
  const handleDevBypass = () => {
    if (!selectedPlan) return;
    
    // Directly update membership and go to app
    updateMembership(selectedPlan);
    navigate('/smart-event-entry');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Membership
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Select the plan that works best for you
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 xl:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg shadow-sm divide-y divide-gray-200 ${
                plan.recommended ? 'border-primary' : 'border-gray-200'
              }`}
            >
              <div className="p-6">
                {plan.recommended && (
                  <div className="mb-4">
                    <span className="inline-flex px-4 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-primary text-white">
                      Recommended
                    </span>
                  </div>
                )}
                <h2 className="text-lg font-medium text-gray-900">{plan.name}</h2>
                <p className="mt-4 text-sm text-gray-500">{plan.description}</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-base font-medium text-gray-500">/{plan.period}</span>
                  )}
                </p>
                <button
                  type="button"
                  className={`mt-6 w-full py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    selectedPlan === plan.id
                      ? 'bg-primary text-white hover:bg-primary-dark border-transparent'
                      : 'bg-white text-primary hover:bg-gray-50 border-primary'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select'}
                </button>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                  What's included
                </h3>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex">
                      <svg
                        className="flex-shrink-0 h-6 w-6 text-green-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="ml-3 text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
              !selectedPlan ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleContinue}
            disabled={!selectedPlan}
          >
            Continue
          </button>
          
          {/* Development shortcut */}
          <div className="mt-4">
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={handleDevBypass}
              disabled={!selectedPlan}
            >
              Development Mode: Skip Payment Process
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MembershipSelection;