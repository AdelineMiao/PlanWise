import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('user')) {
      navigate('/smart-event-entry');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">AI Calendar Assistant</p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-gray-900 lg:text-6xl">
              Plan<span className="text-indigo-600">Wise</span>
            </h1>
            <p className="mt-6 text-xl leading-8 text-gray-500">
              Tell PlanWise what you need to do, journal how your days actually went, and let the assistant learn your schedule before suggesting a better Today Plan.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="btn btn-primary px-7 py-3" to="/create-account">Create Account</Link>
              <Link className="btn btn-secondary px-7 py-3" to="/login">Login</Link>
            </div>
          </div>

          <div>
            <img
              className="w-full rounded-2xl shadow-xl"
              src="/planwise-dashboard-svg.svg"
              alt="PlanWise calendar dashboard"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">One assistant, two learning loops</h2>
          <p className="mt-3 text-gray-500">Time management now, personalized planning after PlanWise understands you.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl bg-white p-7 shadow-sm">
            <div className="text-3xl">🗓️</div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">AI Time Manager</h3>
            <p className="mt-2 text-gray-600">
              Add appointments and flexible tasks in natural language. PlanWise finds open time, respects deadlines, and surfaces conflicts instead of hiding them.
            </p>
          </article>

          <article className="rounded-2xl bg-white p-7 shadow-sm">
            <div className="text-3xl">📓</div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">Journal → Today Plan</h3>
            <p className="mt-2 text-gray-600">
              Journal for seven days. PlanWise learns energy, unfinished work, and recurring priorities, then starts generating optional daily task suggestions.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
