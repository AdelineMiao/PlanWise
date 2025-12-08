import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ user, children, membership, requiredMembership }) {
  // If no user is logged in, redirect to login page
  if (!user) {
    // Store the intended destination to redirect after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Navigate to="/login" replace />;
  }
  
  // If a specific membership is required and user doesn't have it
  if (requiredMembership && membership !== requiredMembership && membership !== 'lifetime') {
    // Show a locked version of the component or redirect to membership page
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
          <div className="flex items-center justify-center text-6xl">🔒</div>
          <h2 className="text-2xl font-bold text-center text-gray-800">Premium Feature</h2>
          <p className="text-center text-gray-600">
            This feature requires a premium membership. Please upgrade your plan to access this feature.
          </p>
          <div className="flex justify-center">
            <a 
              href="/membership" 
              className="btn btn-primary"
            >
              Upgrade Membership
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // If all conditions are met, render the protected component
  return children;
}

export default ProtectedRoute;