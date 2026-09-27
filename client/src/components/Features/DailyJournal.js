import React, { useMemo, useState } from 'react';

const MOODS = [
  { id: 'great', label: 'Great', emoji: '😁', value: 5 },
  { id: 'good', label: 'Good', emoji: '🙂', value: 4 },
  { id: 'okay', label: 'Okay', emoji: '😐', value: 3 },
  { id: 'down', label: 'Down', emoji: '🙁', value: 2 },
  { id: 'bad', label: 'Bad', emoji: '😞', value: 1 },
];

function DailyJournal({ entries, onSave }) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = entries.find((entry) => entry.date === today);

  const [mood, setMood] = useState(existing?.mood || '');
  const [energy, setEnergy] = useState(existing?.energy || 3);
  const [completed, setCompleted] = useState(existing?.completed || '');
  const [unfinished, setUnfinished] = useState(existing?.unfinished || '');
  const [reflection, setReflection] = useState(existing?.reflection || '');
  const [tomorrowFocus, setTomorrowFocus] = useState(existing?.tomorrowFocus || '');
  const [saved, setSaved] = useState(false);

  const learnedDays = useMemo(
    () => new Set(entries.map((entry) => entry.date).filter(Boolean)).size,
    [entries]
  );

  const save = (event) => {
    event.preventDefault();

    onSave({
      date: today,
      mood,
      energy: Number(energy),
      completed: completed.trim(),
      unfinished: unfinished.trim(),
      reflection: reflection.trim(),
      tomorrowFocus: tomorrowFocus.trim(),
      updatedAt: new Date().toISOString(),
    });

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-indigo-600">Daily Journal</p>
            <h2 className="mt-1 text-3xl font-bold text-gray-900">Teach PlanWise how your days actually work</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-500">
              Log what happened, what slipped, and how your energy felt. After seven distinct journal days,
              PlanWise can start generating personalized task suggestions.
            </p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            <strong>{learnedDays}/7</strong> learning days complete
          </div>
        </div>

        <form onSubmit={save} className="space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">How did today feel?</h3>
            <div className="mt-4 flex flex-wrap gap-3">
              {MOODS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMood(item.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${mood === item.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <div className="text-2xl">{item.emoji}</div>
                  <div className="mt-1 text-sm font-medium text-gray-700">{item.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Energy</span>
                <span>{energy}/5</span>
              </div>
              <input
                className="mt-2 w-full"
                type="range"
                min="1"
                max="5"
                step="1"
                value={energy}
                onChange={(event) => setEnergy(event.target.value)}
              />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <label className="text-sm font-semibold text-gray-900">What did you complete?</label>
              <textarea
                className="input mt-3 min-h-36 resize-y"
                placeholder="Finished the analytics deck, did laundry, replied to..."
                value={completed}
                onChange={(event) => setCompleted(event.target.value)}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <label className="text-sm font-semibold text-gray-900">What did not get done?</label>
              <textarea
                className="input mt-3 min-h-36 resize-y"
                placeholder="I pushed the reading to tomorrow because..."
                value={unfinished}
                onChange={(event) => setUnfinished(event.target.value)}
              />
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <label className="text-sm font-semibold text-gray-900">Daily reflection</label>
            <textarea
              className="input mt-3 min-h-32 resize-y"
              placeholder="What made the day easy or difficult? When did you focus best?"
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
            />

            <label className="mt-5 block text-sm font-semibold text-gray-900">Tomorrow's most important focus</label>
            <input
              className="input mt-3"
              placeholder="e.g. Finish application draft"
              value={tomorrowFocus}
              onChange={(event) => setTomorrowFocus(event.target.value)}
            />
          </section>

          <div className="flex justify-end">
            <button className="btn btn-primary px-6" type="submit">
              {saved ? 'Saved ✓' : 'Save today'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DailyJournal;
