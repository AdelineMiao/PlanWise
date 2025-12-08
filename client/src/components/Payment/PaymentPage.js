import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function PaymentPage({ membership, updateMembership }) {
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState(null);
  const [cardholderName, setCardholderName] = useState('');
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expDate, setExpDate] = useState('');
  const [cvc, setCvc] = useState('');
  
  const navigate = useNavigate();
  
  // Determine amount based on selected membership
  const getPriceDetails = () => {
    if (membership === 'premium') {
      return {
        amount: '$5/month',
        description: 'Premium Monthly Membership'
      };
    } else if (membership === 'lifetime') {
      return {
        amount: '$80 (one-time)',
        description: 'Lifetime Membership'
      };
    }
    return { amount: '', description: '' };
  };
  
  const { amount, description } = getPriceDetails();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form fields
    if (!cardholderName.trim()) {
      setError('Please enter the cardholder name');
      return;
    }
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    
    if (!cardNumber.trim() || !expDate.trim() || !cvc.trim()) {
      setError('Please enter all card details');
      return;
    }
    
    // Simulate payment processing
    setProcessing(true);
    setError(null);
    
    // Simulate a network request
    setTimeout(() => {
      // Simulate successful payment
      setProcessing(false);
      setSucceeded(true);
      
      // Update membership status
      updateMembership(membership);
      
      // Redirect to app after a short delay
      setTimeout(() => {
        navigate('/smart-event-entry');
      }, 2000);
    }, 1500);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Complete Your Purchase
          </h1>
          <p className="mt-2 text-gray-600">
            {description} - {amount}
          </p>
        </div>
        
        {succeeded ? (
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
            <strong className="font-bold">Payment successful!</strong>
            <p>Redirecting you to the app...</p>
          </div>
        ) : (
          <form className="bg-white shadow-md rounded-lg p-8" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
                {error}
              </div>
            )}
            
            <div className="mb-6">
              <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                id="cardholderName"
                className="input"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Plan Wise"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <input
                type="text"
                id="cardNumber"
                className="input"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="0000 0000 0000 0000"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="expDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Date
                </label>
                <input
                  type="text"
                  id="expDate"
                  className="input"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  placeholder="MM/YY"
                  required
                />
              </div>
              <div>
                <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 mb-2">
                  CVC
                </label>
                <input
                  type="text"
                  id="cvc"
                  className="input"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="***"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full btn btn-primary py-3"
              disabled={processing || succeeded}
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                `Pay ${amount}`
              )}
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              This is a development version. No actual payment will be processed.
            </p>
          </form>
        )}
        
        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-primary hover:text-primary-dark"
            onClick={() => navigate('/membership')}
          >
            ← Back to membership selection
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;