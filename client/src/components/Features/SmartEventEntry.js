import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import { format } from 'date-fns';
import SmartEventEntryHeader from './SmartEventEntryHeader';
import DailyJournal from './DailyJournal';
import TodayPlan from './TodayPlan';
import api from '../../Services/openAIservice';

const localizer = momentLocalizer(moment);

function toCalendarEvent(event, fallbackId) {
  return {
    id: event.id || fallbackId || Date.now().toString(),
    title: event.title || 'Untitled',
    start: event.start instanceof Date ? event.start : new Date(event.start),
    end: event.end instanceof Date ? event.end : new Date(event.end),
    kind: event.kind || 'event',
    priority: event.priority || 'medium',
    location: event.location || '',
    notes: event.notes || '',
    conflict: Boolean(event.conflict),
    source: event.source || 'user',
  };
}

function SmartEventEntry({ user, membership, logoutUser }) {
  const eventKey = `events_${user.username}`;
  const journalKey = `journal_${user.username}`;

  const [events, setEvents] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'assistant',
      text: 'Tell me what is on your plate. I can add appointments, find time for tasks, respect deadlines, and detect calendar conflicts.',
    },
  ]);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [currentFeature, setCurrentFeature] = useState('calendar');

  useEffect(() => {
    try {
      const savedEvents = JSON.parse(localStorage.getItem(eventKey) || '[]');
      setEvents(savedEvents.map((event, index) => toCalendarEvent(event, `saved-${index}`)));
    } catch (error) {
      console.error('Could not load saved events:', error);
      setEvents([]);
    }

    try {
      const savedJournal = JSON.parse(localStorage.getItem(journalKey) || '[]');
      setJournalEntries(Array.isArray(savedJournal) ? savedJournal : []);
    } catch (error) {
      console.error('Could not load journal:', error);
      setJournalEntries([]);
    }
  }, [eventKey, journalKey]);

  useEffect(() => {
    localStorage.setItem(eventKey, JSON.stringify(events));
  }, [events, eventKey]);

  useEffect(() => {
    localStorage.setItem(journalKey, JSON.stringify(journalEntries));
  }, [journalEntries, journalKey]);

  const learnedDays = useMemo(
    () => new Set(journalEntries.map((entry) => entry.date).filter(Boolean)).size,
    [journalEntries]
  );

  const addEvents = (incoming) => {
    const now = Date.now();
    const normalized = incoming
      .map((event, index) => toCalendarEvent(event, `ai-${now}-${index}`))
      .filter((event) => !Number.isNaN(event.start.getTime()) && !Number.isNaN(event.end.getTime()));

    setEvents((previous) => [...previous, ...normalized]);
  };

  const saveJournal = (entry) => {
    setJournalEntries((previous) => {
      const withoutToday = previous.filter((item) => item.date !== entry.date);
      return [entry, ...withoutToday].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    });
  };

  const cancelMatching = (query) => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return 0;

    const matching = events.filter((event) =>
      event.title.toLowerCase().includes(normalized) ||
      normalized.includes(event.title.toLowerCase())
    );

    if (!matching.length) return 0;

    const ids = new Set(matching.map((event) => event.id));
    setEvents((previous) => previous.filter((event) => !ids.has(event.id)));
    return matching.length;
  };

  const handleSubmit = async () => {
    const message = inputText.trim();
    if (!message || isProcessing) return;

    setChatHistory((previous) => [...previous, { sender: 'user', text: message }]);
    setInputText('');
    setIsProcessing(true);

    try {
      const result = await api.planRequest(message, events);

      if (result.action === 'cancel') {
        const count = cancelMatching(result.cancellation_query || message);
        setChatHistory((previous) => [
          ...previous,
          {
            sender: 'assistant',
            text: count
              ? `Removed ${count} matching calendar item(s).`
              : `I could not find a calendar item matching "${result.cancellation_query || message}".`,
          },
        ]);
      } else {
        addEvents(result.scheduled_events || []);

        const scheduledCount = result.scheduled_events?.length || 0;
        const conflictCount = result.conflicts?.length || 0;
        const unscheduledCount = result.unscheduled?.length || 0;

        const details = [
          result.assistant_message,
          scheduledCount ? `Scheduled ${scheduledCount} item(s).` : '',
          conflictCount ? `${conflictCount} conflict(s) need attention.` : '',
          unscheduledCount ? `${unscheduledCount} item(s) could not be placed automatically.` : '',
        ].filter(Boolean).join(' ');

        setChatHistory((previous) => [
          ...previous,
          {
            sender: 'assistant',
            text: details || 'I updated your plan.',
          },
        ]);
      }
    } catch (error) {
      console.error('Plan request failed:', error);
      setChatHistory((previous) => [
        ...previous,
        {
          sender: 'assistant',
          text: error.response?.data?.error || 'I could not process that request. Please try again.',
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAllEvents = () => {
    setEvents([]);
    setChatHistory((previous) => [
      ...previous,
      { sender: 'assistant', text: 'All calendar items have been cleared.' },
    ]);
  };

  const eventStyleGetter = (event) => {
    if (event.conflict) {
      return {
        style: {
          backgroundColor: '#DC2626',
          borderRadius: '6px',
          border: 'none',
        },
      };
    }

    if (event.kind === 'task') {
      return {
        style: {
          backgroundColor: '#4F46E5',
          borderRadius: '6px',
          border: 'none',
        },
      };
    }

    return {
      style: {
        backgroundColor: '#0F766E',
        borderRadius: '6px',
        border: 'none',
      },
    };
  };

  const renderCalendar = () => (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
      <div className="flex-1 min-h-0 p-4 sm:p-6">
        <div className="flex h-full min-h-[520px] flex-col rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-indigo-600">Time Manager</p>
              <h2 className="text-2xl font-bold text-gray-900">
                {user?.firstName ? `${user.firstName}'s Calendar` : 'My Calendar'}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                {learnedDays < 7
                  ? `PlanWise is learning your routine: ${learnedDays}/7 journal days`
                  : 'Personalized daily planning is unlocked'}
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={clearAllEvents}>
              Clear calendar
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={['month', 'week', 'day']}
              view={view}
              date={date}
              onNavigate={setDate}
              onView={setView}
              eventPropGetter={eventStyleGetter}
              popup
            />
          </div>
        </div>
      </div>

      <div className="border-t bg-white shadow-lg">
        <div className="mx-auto max-w-7xl p-4">
          <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
            {chatHistory.slice(-5).map((message, index) => (
              <div
                key={index}
                className={message.sender === 'user' ? 'text-right' : 'text-left'}
              >
                <div
                  className={`inline-block max-w-3xl rounded-xl px-3 py-2 text-sm ${
                    message.sender === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <textarea
              className="input min-h-[46px] flex-1 resize-none"
              rows="1"
              placeholder="e.g. 周五下午3点去看医生，路上40分钟，上午还要交作业，帮我安排一下"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isProcessing}
            />
            <button
              className={`btn btn-primary self-end ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={handleSubmit}
              disabled={isProcessing || !inputText.trim()}
            >
              {isProcessing ? 'Planning...' : 'Plan'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Tasks are placed into open time. Fixed-time conflicts are shown in red instead of silently overwritten.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col">
      <SmartEventEntryHeader
        user={user}
        logoutUser={logoutUser}
        membership={membership}
        currentFeature={currentFeature}
        onFeatureChange={setCurrentFeature}
      />

      {currentFeature === 'calendar' && renderCalendar()}
      {currentFeature === 'journal' && (
        <DailyJournal entries={journalEntries} onSave={saveJournal} />
      )}
      {currentFeature === 'today' && (
        <TodayPlan
          events={events}
          journalEntries={journalEntries}
          onAddEvents={addEvents}
          membership={membership}
        />
      )}
    </div>
  );
}

export default SmartEventEntry;
