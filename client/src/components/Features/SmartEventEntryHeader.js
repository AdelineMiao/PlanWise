import React from 'react';
import { useNavigate } from 'react-router-dom';

// In SmartEventEntryHeader.js, add navigation links
function SmartEventEntryHeader({ user, logoutUser, membership, currentFeature, onFeatureChange }) {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };
  
  const features = [
    { id: 'calendar', name: 'Smart Event Entry' },
    { id: 'habits', name: 'Habit Recommendations', premium: true },
    { id: 'group', name: 'Group Availability', premium: true },
    { id: 'tasks', name: 'Auto Task Scheduler', premium: true }
  ];
  
  return (
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">
                Plan<span className="text-gray-900">Wise</span>
              </h1>
            </div>
            <div className="flex items-center">
              {membership === 'basic' && (
                <button
                  onClick={() => navigate('/membership')}
                  className="mr-4 text-sm bg-green-50 text-green-700 px-3 py-1 rounded hover:bg-green-100 transition"
                >
                  Upgrade Membership
                </button>
              )}
              <span className="mr-4 text-sm text-gray-600">
                {membership === 'basic' ? 'Basic Plan' : membership === 'premium' ? 'Premium Plan' : 'Lifetime Plan'}
              </span>
              <div className="mr-4 font-medium text-gray-800">
                {user.firstName} {user.lastName}
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Feature navigation */}
          <div className="flex space-x-4 py-2 border-b">
            {features.map(feature => {
              const isPremiumLocked = feature.premium && membership === 'basic';
              
              return (
                <button
                  key={feature.id}
                  className={`px-4 py-2 rounded-md ${
                    currentFeature === feature.id
                      ? 'bg-primary text-white'
                      : isPremiumLocked
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => !isPremiumLocked && onFeatureChange(feature.id)}
                  disabled={isPremiumLocked}
                >
                  {feature.name}
                  {isPremiumLocked && (
                    <span className="ml-1 text-xs">🔒</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SmartEventEntryHeader;