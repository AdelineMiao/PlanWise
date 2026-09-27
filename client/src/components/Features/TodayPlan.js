import React, { useMemo, useState } from 'react';
import api from '../../Services/openAIservice';

function TodayPlan({ events, journalEntries, onAddEvents, membership }) {
  const today = new Date().toISOString().slice(0, 10);
  const learnedDays = useMemo(
    () => new Set(journalEntries.map((entry) => entry.date).filter(Boolean)).size,
    [journalEntries]
  );

  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary] = useState('');
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const unlocked = learnedDays >= 7;
  const premiumLocked = membership === 'basic';

  const generate = async () => {
    if (!unlocked || premiumLocked || loading) return;

    setLoading(true);
    setMessage('');

    try {
      const data = await api.getDailySuggestions({
        journalEntries,
        events,
        today,
      });

      setSuggestions(data.suggestions || []);
      setSummary(data.summary || '');
      setScheduledEvents(data.scheduled_events || []);
      if (data.unscheduled?.length) {
        setMessage(`${data.unscheduled.length} suggestion(s) could not be placed automatically.`);
      }
    } catch (error) {
      const serverMessage = error.response?.data?.error || 'Could not generate suggestions.';
      setMessage(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  const addAll = () => {
    if (!scheduledEvents.length) return;
    onAddEvents(scheduledEvents);
    setMessage('Today plan added to your calendar.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-indigo-600">Today Plan</p>
          <h2 className="mt-1 text-3xl font-bold text-gray-900">A daily plan based on your real routine</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            PlanWise learns from your journal for seven days, then proposes optional tasks that fit around your existing calendar.
          </p>
        </div>

        {premiumLocked && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Today Plan is a Premium feature. Your journal and calendar remain available on the Basic plan.
          </div>
        )}

        {!unlocked && (
          <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
            <div className="text-4xl">🧠</div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900">Learning your schedule</h3>
            <p className="mt-2 text-gray-600">
              You have logged <strong>{learnedDays}</strong> of 7 journal days.
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${Math.min(100, (learnedDays / 7) * 100)}%` }}
              />
            </div>
            <p className="mt-4 text-sm text-gray-500">
              During this learning period, PlanWise uses your entries to understand energy patterns, unfinished work, and recurring priorities.
            </p>
          </div>
        )}

        {unlocked && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Generate today's suggestions</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Suggestions are optional and are placed only into open time on your calendar.
                  </p>
                </div>
                <button
                  className={`btn btn-primary ${(loading || premiumLocked) ? 'cursor-not-allowed opacity-50' : ''}`}
                  onClick={generate}
                  disabled={loading || premiumLocked}
                >
                  {loading ? 'Thinking...' : 'Generate Today Plan'}
                </button>
              </div>
            </div>

            {summary && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-sm text-indigo-900">
                {summary}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {suggestions.map((suggestion, index) => (
                  <article key={`${suggestion.title}-${index}`} className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                          {suggestion.category || 'task'}
                        </p>
                        <h4 className="mt-1 text-lg font-semibold text-gray-900">{suggestion.title}</h4>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        {suggestion.duration_min} min
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">{suggestion.reason}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                      <span className="rounded-full bg-gray-100 px-2 py-1">{suggestion.priority} priority</span>
                      {suggestion.preferred_time && (
                        <span className="rounded-full bg-gray-100 px-2 py-1">
                          prefers {suggestion.preferred_time}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {scheduledEvents.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Ready to add</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {scheduledEvents.length} suggestion(s) found open calendar time.
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={addAll}>Add all to Calendar</button>
                </div>
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TodayPlan;
