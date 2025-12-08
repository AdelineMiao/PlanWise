import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    
    if (user) {
      navigate('/smart-event-entry');
    }
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Hero section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Plan<span className="text-indigo-600">Wise</span>
              </h1>
              <p className="mt-6 text-xl text-gray-500">
                Manage your time efficiently with advanced scheduling and productivity tools. 
                Plan your day with natural language inputs and get personalized recommendations.
              </p>
              <div className="mt-10 sm:flex">
                <div className="rounded-md shadow">
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                  >
                    Login
                  </Link>
                </div>
                <div className="mt-3 sm:mt-0 sm:ml-3">
                  <Link
                    to="/create-account"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="pl-4 sm:pl-6 md:-ml-16 lg:-ml-8 lg:pl-0">
                {/* Use the SVG file from the public directory */}
                <img
                  className="w-full rounded-xl shadow-xl"
                  src="/planwise-dashboard-svg.svg"
                  alt="PlanWise dashboard preview"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features section */}
      <div className="py-16 bg-gray-50 overflow-hidden lg:py-24">
        <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
          <div className="relative">
            <h2 className="text-center text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Smart Planning Features
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-center text-xl text-gray-500">
              PlanWise helps you organize your schedule with powerful AI-driven tools.
            </p>
          </div>

          <div className="relative mt-12 lg:mt-16 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div className="mt-10 space-y-10 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10">
              {[
                {
                  title: 'Smart Event Entry',
                  description: 'Add events to your calendar using natural language.',
                  icon: '📝',
                },
                {
                  title: 'Auto Task Scheduler',
                  description: 'Automatically schedule tasks based on priorities and deadlines.',
                  icon: '⏱️',
                },
                {
                  title: 'Group Availability',
                  description: 'Coordinate schedules with multiple people to find common free time.',
                  icon: '👥',
                },
                {
                  title: 'Habit Recommendations',
                  description: 'Get personalized routine suggestions based on your behavior.',
                  icon: '🌟',
                },
              ].map((feature) => (
                <div key={feature.title} className="relative">
                  <div className="absolute h-12 w-12 flex items-center justify-center rounded-md bg-indigo-600 text-white text-2xl">
                    {feature.icon}
                  </div>
                  <div className="ml-16">
                    <h3 className="text-lg font-medium text-gray-900">{feature.title}</h3>
                    <p className="mt-2 text-base text-gray-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;