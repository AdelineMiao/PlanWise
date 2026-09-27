import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
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

function CalendarToolbar({ label, onNavigate, onView, view }) {
  return (
    <div className="pw-calendar-toolbar">
      <div className="pw-toolbar-group">
        <button className="pw-toolbar-button" onClick={() => onNavigate('TODAY')}>Today</button>
        <button className="pw-toolbar-button" onClick={() => onNavigate('PREV')}>‹</button>
        <button className="pw-toolbar-button" onClick={() => onNavigate('NEXT')}>›</button>
      </div>

      <div className="pw-toolbar-label">{label}</div>

      <div className="pw-toolbar-group pw-view-switcher">
        {['month', 'week', 'day'].map((item) => (
          <button
            key={item}
            className={`pw-toolbar-button ${view === item ? 'active' : ''}`}
            onClick={() => onView(item)}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarEvent({ event }) {
  const duration = Math.max(0, (event.end.getTime() - event.start.getTime()) / 60000);
  return (
    <div
      className={`pw-calendar-event-content ${duration <= 30 ? 'compact' : ''}`}
      title={event.title}
    >
      {event.title}
    </div>
  );
}

function SmartEventEntry({ user, membership, logoutUser }) {
  const eventKey = `events_${user.username}`;
  const journalKey = `journal_${user.username}`;
  const splitRef = useRef(null);
  const chatEndRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'assistant',
      text: 'Tell me what is on your plate. I can add appointments, split multiple tasks, respect deadlines, and detect calendar conflicts.',
    },
  ]);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());
  const [currentFeature, setCurrentFeature] = useState('calendar');
  const [calendarWidth, setCalendarWidth] = useState(64);
  const [isResizing, setIsResizing] = useState(false);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatHistory, isProcessing]);

  useEffect(() => {
    if (!isResizing) return undefined;

    const handlePointerMove = (event) => {
      if (!splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const nextWidth = ((event.clientX - rect.left) / rect.width) * 100;
      setCalendarWidth(Math.max(42, Math.min(76, nextWidth)));
    };

    const stopResizing = () => setIsResizing(false);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing);
    document.body.classList.add('pw-resizing');

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
      document.body.classList.remove('pw-resizing');
    };
  }, [isResizing]);

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

      if (result.planner_mode === 'fallback' && result.ai_error) {
        console.warn('PlanWise AI request fell back to local parsing:', result.ai_error);
      }

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
        const scheduled = (result.scheduled_events || []).slice().sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );
        addEvents(scheduled);

        const scheduleSummary = scheduled.length
          ? scheduled
              .map((item) => {
                const start = new Date(item.start);
                return `• ${item.title} — ${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
              })
              .join('\n')
          : '';

        const extra = [
          result.conflicts?.length ? `${result.conflicts.length} conflict(s) need attention.` : '',
          result.unscheduled?.length ? `${result.unscheduled.length} item(s) could not be placed automatically.` : '',
        ].filter(Boolean).join(' ');

        setChatHistory((previous) => [
          ...previous,
          {
            sender: 'assistant',
            text: [result.assistant_message, scheduleSummary, extra].filter(Boolean).join('\n'),
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
        className: 'pw-event-conflict',
        style: { backgroundColor: '#ff453a' },
      };
    }

    if (event.kind === 'task') {
      return {
        className: 'pw-event-task',
        style: { backgroundColor: '#5856d6' },
      };
    }

    return {
      className: 'pw-event-appointment',
      style: { backgroundColor: '#0a84ff' },
    };
  };

  const renderCalendar = () => (
    <main className="pw-main-shell">
      <div className="pw-split-layout" ref={splitRef}>
        <section
          className="pw-calendar-pane"
          style={{ width: `${calendarWidth}%` }}
        >
          <div className="pw-panel-card pw-calendar-card">
            <header className="pw-panel-header">
              <div>
                <p className="pw-eyebrow">Time Manager</p>
                <h2 className="pw-panel-title">
                  {user?.firstName ? `${user.firstName}'s Calendar` : 'My Calendar'}
                </h2>
                <p className="pw-panel-subtitle">
                  {learnedDays < 7
                    ? `Learning your routine: ${learnedDays}/7 journal days`
                    : 'Personalized daily planning is unlocked'}
                </p>
              </div>

              <button className="pw-clear-button" onClick={clearAllEvents}>
                Clear
              </button>
            </header>

            <div className="pw-calendar-wrap">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                views={['month', 'week', 'day']}
                view={view}
                date={date}
                onNavigate={setDate}
                onView={setView}
                eventPropGetter={eventStyleGetter}
                components={{
                  toolbar: CalendarToolbar,
                  event: CalendarEvent,
                }}
                step={30}
                timeslots={2}
                min={new Date(1970, 0, 1, 7, 0, 0)}
                max={new Date(1970, 0, 1, 22, 0, 0)}
                scrollToTime={new Date(1970, 0, 1, 8, 0, 0)}
                popup
                style={{ height: '100%' }}
              />
            </div>
          </div>
        </section>

        <div
          className="pw-resizer"
          role="separator"
          aria-label="Resize calendar and chat"
          onPointerDown={() => setIsResizing(true)}
        >
          <span />
        </div>

        <aside className="pw-chat-pane">
          <div className="pw-panel-card pw-chat-card">
            <header className="pw-chat-header">
              <div className="pw-chat-avatar">P</div>
              <div>
                <h3 className="pw-chat-title">PlanWise</h3>
                <p className="pw-panel-subtitle">AI scheduling assistant</p>
              </div>
            </header>

            <div className="pw-chat-thread">
              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`pw-message-row ${message.sender === 'user' ? 'user' : 'assistant'}`}
                >
                  {message.sender === 'assistant' && (
                    <div className="pw-message-avatar">P</div>
                  )}
                  <div
                    className={`pw-message-bubble ${message.sender === 'user' ? 'user' : 'assistant'}`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="pw-message-row assistant">
                  <div className="pw-message-avatar">P</div>
                  <div className="pw-message-bubble assistant pw-thinking">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="pw-composer-area">
              <div className="pw-composer">
                <textarea
                  className="pw-composer-input"
                  rows="3"
                  placeholder="Tell PlanWise what you need to do..."
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

                <div className="pw-composer-footer">
                  <span className="pw-composer-hint">Enter to plan · Shift+Enter for a new line</span>
                  <button
                    className="pw-send-button"
                    onClick={handleSubmit}
                    disabled={isProcessing || !inputText.trim()}
                    aria-label="Send plan request"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );

  return (
    <div className="pw-app-shell">
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
