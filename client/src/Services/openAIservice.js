import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

function localIso(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 19);
}

function timezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  } catch (error) {
    return 'local';
  }
}

function serializeEvent(event) {
  const serialize = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return localIso(date);
  };

  return {
    id: event.id,
    title: event.title,
    start: serialize(event.start),
    end: serialize(event.end),
    kind: event.kind || 'event',
    priority: event.priority || 'medium',
    location: event.location || '',
    notes: event.notes || '',
  };
}

const planRequest = async (text, events = []) => {
  const response = await axios.post(`${API_URL}/plan-request`, {
    text,
    events: events.map(serializeEvent),
    referenceLocal: localIso(),
    timezone: timezone(),
  });

  return response.data;
};

const getDailySuggestions = async ({ journalEntries, events, today }) => {
  const response = await axios.post(`${API_URL}/daily-suggestions`, {
    journalEntries,
    events: events.map(serializeEvent),
    today,
    referenceLocal: localIso(),
    timezone: timezone(),
  });

  return response.data;
};

const createCheckoutSession = async (plan) => {
  const response = await axios.post(`${API_URL}/create-checkout-session`, { plan });
  return response.data;
};

const verifyCheckoutSession = async (sessionId) => {
  const response = await axios.get(`${API_URL}/checkout-session/${sessionId}`);
  return response.data;
};

const health = async () => {
  const response = await axios.get(`${API_URL}/health`);
  return response.data;
};

const api = {
  planRequest,
  getDailySuggestions,
  createCheckoutSession,
  verifyCheckoutSession,
  health,
};

export default api;
