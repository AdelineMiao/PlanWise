import React from 'react';
import { useNavigate } from 'react-router-dom';

function SmartEventEntryHeader({ user, logoutUser, membership, currentFeature, onFeatureChange }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const features = [
    { id: 'calendar', name: 'Calendar' },
    { id: 'journal', name: 'Daily Journal' },
    { id: 'today', name: 'Today Plan', premium: true },
  ];

  return (
    <div className="bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">
                Plan<span className="text-gray-900">Wise</span>
              </h1>
              <span className="ml-3 hidden rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 sm:inline">
                AI Calendar Assistant
              </span>
            </div>

            <div className="flex items-center gap-3">
              {membership === 'basic' && (
                <button
                  onClick={() => navigate('/membership')}
                  className="hidden rounded-md bg-green-50 px-3 py-1 text-sm text-green-700 transition hover:bg-green-100 sm:block"
                >
                  Upgrade
                </button>
              )}
              <span className="hidden text-sm text-gray-500 md:block">
                {membership === 'basic' ? 'Basic' : membership === 'premium' ? 'Premium' : 'Lifetime'}
              </span>
              <div className="hidden font-medium text-gray-800 sm:block">
                {user?.firstName} {user?.lastName}
              </div>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b py-2">
            {features.map((feature) => {
              const locked = feature.premium && membership === 'basic';

              return (
                <button
                  key={feature.id}
                  className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${
                    currentFeature === feature.id
                      ? 'bg-primary text-white'
                      : locked
                      ? 'cursor-not-allowed text-gray-400'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => !locked && onFeatureChange(feature.id)}
                  disabled={locked}
                >
                  {feature.name}
                  {locked && <span className="ml-1 text-xs">🔒</span>}
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
