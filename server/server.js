require('dotenv').config();

const express = require('express');
const cors = require('cors');
const stripeFactory = require('stripe');

const app = express();
const port = process.env.PORT || 4000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
const aiProvider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
const aiBaseUrl = (process.env.AI_BASE_URL || (
  aiProvider === 'deepseek'
    ? 'https://api.deepseek.com'
    : 'https://api.openai.com/v1'
)).replace(/\/$/, '');
const aiModel = process.env.AI_MODEL || (
  aiProvider === 'deepseek'
    ? 'deepseek-flash'
    : (process.env.OPENAI_MODEL || 'gpt-5.6-luna')
);
const aiApiKey = process.env.AI_API_KEY
  || process.env.DEEPSEEK_API_KEY
  || process.env.OPENAI_API_KEY
  || '';

const stripe = process.env.STRIPE_SECRET_KEY
  ? stripeFactory(process.env.STRIPE_SECRET_KEY)
  : null;

app.use(cors({
  origin: clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const PRICE_IDS = {
  premium: process.env.STRIPE_PRICE_ID_MONTHLY || '',
  lifetime: process.env.STRIPE_PRICE_ID_LIFETIME || '',
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function parseFloating(value) {
  if (!value || typeof value !== 'string') return null;
  const clean = value.replace('Z', '').slice(0, 16);
  const parts = clean.split('T');
  const dateParts = parts[0].split('-').map(Number);
  const timeParts = (parts[1] || '00:00').split(':').map(Number);

  if (dateParts.length !== 3 || dateParts.some(Number.isNaN)) return null;

  return new Date(Date.UTC(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    timeParts[0] || 0,
    timeParts[1] || 0,
    0,
    0
  ));
}

function formatFloating(date) {
  return [
    date.getUTCFullYear(),
    '-',
    pad(date.getUTCMonth() + 1),
    '-',
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    ':',
    pad(date.getUTCMinutes()),
    ':00',
  ].join('');
}

function dateOnly(date) {
  return [
    date.getUTCFullYear(),
    '-',
    pad(date.getUTCMonth() + 1),
    '-',
    pad(date.getUTCDate()),
  ].join('');
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function setUtcTime(date, hour, minute) {
  const copy = new Date(date.getTime());
  copy.setUTCHours(hour, minute, 0, 0);
  return copy;
}

function sameFloatingDay(a, b) {
  return dateOnly(a) === dateOnly(b);
}

function extractResponseText(data) {
  if (!data) return '';
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }

  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (part && part.type === 'output_text' && typeof part.text === 'string') {
        return part.text;
      }
    }
  }

  return '';
}

async function callStructuredAI(name, schema, instructions, input) {
  if (!aiApiKey) return null;

  const response = await fetch(aiBaseUrl + '/responses', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + aiApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: aiModel,
      instructions,
      input: JSON.stringify(input),
      text: {
        format: {
          type: 'json_schema',
          name,
          strict: true,
          schema,
        },
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : 'OpenAI request failed';
    throw new Error(message);
  }

  const text = extractResponseText(data);
  if (!text) throw new Error('OpenAI returned an empty response');

  return JSON.parse(text);
}

function nextWeekday(reference, targetDay) {
  const currentDay = reference.getUTCDay();
  let delta = targetDay - currentDay;
  if (delta <= 0) delta += 7;
  return addDays(reference, delta);
}

function inferDateFromText(text, reference) {
  const lower = text.toLowerCase();

  if (/\b(today)\b/.test(lower) || /今天/.test(text)) return dateOnly(reference);
  if (/\b(tomorrow)\b/.test(lower) || /明天/.test(text)) return dateOnly(addDays(reference, 1));
  if (/后天/.test(text)) return dateOnly(addDays(reference, 2));

  const weekdays = [
    { index: 0, patterns: ['sunday', 'sun', '周日', '星期日', '周天', '星期天'] },
    { index: 1, patterns: ['monday', 'mon', '周一', '星期一'] },
    { index: 2, patterns: ['tuesday', 'tue', '周二', '星期二'] },
    { index: 3, patterns: ['wednesday', 'wed', '周三', '星期三'] },
    { index: 4, patterns: ['thursday', 'thu', '周四', '星期四'] },
    { index: 5, patterns: ['friday', 'fri', '周五', '星期五'] },
    { index: 6, patterns: ['saturday', 'sat', '周六', '星期六'] },
  ];

  for (const weekday of weekdays) {
    if (weekday.patterns.some((pattern) => lower.includes(pattern) || text.includes(pattern))) {
      return dateOnly(nextWeekday(reference, weekday.index));
    }
  }

  const isoDate = text.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
  if (isoDate) {
    return isoDate[1] + '-' + pad(isoDate[2]) + '-' + pad(isoDate[3]);
  }

  const cnDate = text.match(/(\d{1,2})月(\d{1,2})[日号]?/);
  if (cnDate) {
    let year = reference.getUTCFullYear();
    const candidate = new Date(Date.UTC(year, Number(cnDate[1]) - 1, Number(cnDate[2])));
    if (candidate < setUtcTime(reference, 0, 0)) year += 1;
    return year + '-' + pad(cnDate[1]) + '-' + pad(cnDate[2]);
  }

  return '';
}

function chineseNumberToInt(value) {
  const map = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '十一': 11, '十二': 12,
  };
  return Object.prototype.hasOwnProperty.call(map, value) ? map[value] : NaN;
}

function inferTimeFromText(text) {
  const english = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (english) {
    let hour = Number(english[1]);
    const minute = Number(english[2] || 0);
    const period = english[3].toLowerCase();
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return pad(hour) + ':' + pad(minute);
  }

  const twentyFour = text.match(/\b([01]?\d|2[0-3])[:：](\d{2})\b/);
  if (twentyFour) {
    return pad(twentyFour[1]) + ':' + pad(twentyFour[2]);
  }

  const chineseDigits = text.match(/(早上|上午|中午|下午|晚上)?\s*(\d{1,2})\s*点(?:\s*(半|\d{1,2})\s*分?)?/);
  if (chineseDigits) {
    let hour = Number(chineseDigits[2]);
    const minute = chineseDigits[3] === '半' ? 30 : Number(chineseDigits[3] || 0);
    const period = chineseDigits[1] || '';
    if ((period === '下午' || period === '晚上') && hour < 12) hour += 12;
    if (period === '中午' && hour < 11) hour += 12;
    return pad(hour) + ':' + pad(minute);
  }

  const chineseWords = text.match(/(早上|上午|中午|下午|晚上)?\s*(十二|十一|十|[一二两三四五六七八九])\s*点(?:\s*(半|[一二三四五六七八九十]+)\s*分?)?/);
  if (chineseWords) {
    let hour = chineseNumberToInt(chineseWords[2]);
    let minute = chineseWords[3] === '半' ? 30 : 0;
    const period = chineseWords[1] || '';
    if ((period === '下午' || period === '晚上') && hour < 12) hour += 12;
    if (period === '中午' && hour < 11) hour += 12;
    return pad(hour) + ':' + pad(minute);
  }

  return '';
}

function inferDuration(text) {
  if (/一个半\s*小时/.test(text)) return 90;
  if (/半\s*小时/.test(text)) return 30;
  if (/(一个|一)\s*小时/.test(text)) return 60;

  const chinese = text.match(/(\d+(?:\.\d+)?)\s*(小时|分钟)/);
  if (chinese) {
    const amount = Number(chinese[1]);
    return chinese[2] === '小时' ? Math.round(amount * 60) : Math.round(amount);
  }

  const english = text.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)/i);
  if (english) {
    const amount = Number(english[1]);
    return /^h/i.test(english[2]) ? Math.round(amount * 60) : Math.round(amount);
  }

  return 60;
}

function isDurationOnlyClause(clause) {
  const cleaned = clause
    .replace(/大概|大约|差不多|左右|约/g, '')
    .replace(/\s+/g, '');
  return /^(一个半小时|一个小时|一小时|半小时|\d+(?:\.\d+)?小时|\d+分钟)$/.test(cleaned);
}

function conciseFallbackTitle(clause) {
  const normalized = clause
    .replace(/新办的简历/g, '最新版简历')
    .replace(/新版的简历/g, '最新版简历')
    .trim();

  // Common English interview phrasing.
  if (/\binterview\b/i.test(normalized)) {
    const isProductManager = /\b(product manager|product management|pm)\b/i.test(normalized);
    const isAI = /\bAI\b/i.test(normalized);
    const byteDance = /\bbyte\s*dance\b/i.test(normalized);

    if (byteDance && isProductManager) {
      return (isAI ? 'AI ' : '') + 'PM Interview · ByteDance';
    }

    const companyMatch = normalized.match(
      /\b(?:by|with)\s+([A-Za-z][A-Za-z0-9 .&-]{1,30}?)(?=\s+(?:at|on|tomorrow|today|next|this)\b|$)/i
    );

    let role = normalized
      .replace(/^\s*(also\s+)?/i, '')
      .replace(/^\s*i\s+(?:have|have an|have a|am having|need to do)\s+/i, '')
      .replace(/\b(?:today|tomorrow|the day after tomorrow)\b/gi, '')
      .replace(/\b(?:at|on)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '')
      .replace(/\b(?:by|with)\s+[A-Za-z][A-Za-z0-9 .&-]{1,30}?(?=\s+(?:at|on|tomorrow|today|next|this)\b|$)/i, '')
      .replace(/\binterview\b/i, '')
      .replace(/\bproduct manager\b/i, 'PM')
      .replace(/\s+/g, ' ')
      .trim();

    const roleTitle = role ? role + ' Interview' : 'Interview';
    return companyMatch ? roleTitle + ' · ' + companyMatch[1].trim() : roleTitle;
  }

  // Common English resume / CV submission phrasing.
  if (/\b(cv|resume)\b/i.test(normalized)) {
    const isNewVersion = /\b(new version|new|latest|updated|revised)\b/i.test(normalized);
    if (/\b(submit|send|email|share|remind)\b/i.test(normalized)) {
      return isNewVersion ? 'Submit new CV' : 'Submit CV';
    }
    return isNewVersion ? 'Update CV' : 'CV';
  }

  if (/面试/.test(normalized)) {
    const eventText = normalized
      .replace(/今天|明天|后天|前一天|前一日/g, '')
      .replace(/(早上|上午|中午|下午|晚上)?\s*\d{1,2}\s*点(?:半|\d{1,2}\s*分?)?/g, '')
      .replace(/(早上|上午|中午|下午|晚上)?\s*(十二|十一|十|[一二两三四五六七八九])\s*点(?:半)?/g, '')
      .replace(/^(我有一个|我有|我要|我需要|有一个)/, '')
      .replace(/大概|大约|左右/g, '')
      .trim();

    const companyMatch = eventText.match(/([A-Za-z0-9\u4e00-\u9fa5·]{2,20}?)(?:的)?面试/);
    if (companyMatch) {
      const company = companyMatch[1].replace(/的$/, '').trim();
      if (company) return company + '面试';
    }
    return '面试';
  }

  if (/简历/.test(normalized) && /(HR|hr|人事)/.test(normalized)) {
    return '提交最新版简历';
  }

  if (/简历/.test(normalized)) return '更新简历';

  const cleaned = normalized
    .replace(/\b(today|tomorrow|tonight)\b/gi, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, '')
    .replace(/^\s*(also\s+)?/i, '')
    .replace(/^\s*(i\s+(have|need|want|must|should)\s+(to\s+)?)\s*/i, '')
    .replace(/今天|明天|后天|前一天|前一日|当天/g, '')
    .replace(/早上|上午|中午|下午|晚上/g, '')
    .replace(/\d{1,2}[:：]\d{2}/g, '')
    .replace(/\d{1,2}\s*点(?:半|\d{1,2}分)?/g, '')
    .replace(/(十二|十一|十|[一二两三四五六七八九])\s*点(?:半)?/g, '')
    .replace(/大概|大约|左右|差不多/g, '')
    .replace(/我有一个|我有|我要|我需要|我得|需要把|需要|把/g, '')
    .replace(/[，。；,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, 32) || 'Calendar item';
}

function fallbackPlanner(text, referenceLocal) {
  const reference = parseFloating(referenceLocal) || new Date();
  const lower = text.toLowerCase();

  if (
    lower.includes('cancel') ||
    lower.includes('delete') ||
    lower.includes('remove') ||
    text.includes('取消') ||
    text.includes('删除') ||
    text.includes('移除')
  ) {
    return {
      action: 'cancel',
      cancellation_query: text
        .replace(/cancel|delete|remove/gi, '')
        .replace(/取消|删除|移除/g, '')
        .trim(),
      assistant_message: 'I will remove matching calendar items.',
      items: [],
    };
  }

  const clauses = text
    .split(/[，。；,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const items = [];
  let anchorDate = '';

  for (const clause of clauses) {
    if (isDurationOnlyClause(clause) && items.length) {
      items[items.length - 1].duration_min = inferDuration(clause);
      continue;
    }

    let clauseDate = '';
    if (/(前一天|前一日|the day before)/i.test(clause) && anchorDate) {
      const anchor = parseFloating(anchorDate + 'T00:00');
      clauseDate = anchor ? dateOnly(addDays(anchor, -1)) : '';
    }

    if (!clauseDate) {
      clauseDate = inferDateFromText(clause, reference);
    }

    const hasExplicitDate = /(今天|明天|后天|周[一二三四五六日天]|星期[一二三四五六日天]|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}月\d{1,2})/i.test(clause);
    if (hasExplicitDate && clauseDate) anchorDate = clauseDate;

    const startTime = inferTimeFromText(clause);
    const actionable =
      Boolean(startTime) ||
      /(面试|简历|提交|发送|发给|会议|开会|医生|看病|作业|汇报|复习|学习|健身|appointment|interview|meeting|resume|submit|send)/i.test(clause);

    if (!actionable) continue;

    let duration = inferDuration(clause);
    if (/简历/.test(clause) && !/(小时|分钟|hours?|hrs?|minutes?|mins?)/i.test(clause)) {
      duration = 30;
    }

    items.push({
      title: conciseFallbackTitle(clause),
      kind: startTime ? 'event' : 'task',
      date: clauseDate || anchorDate || dateOnly(reference),
      start_time: startTime,
      duration_min: duration,
      deadline: '',
      priority: 'medium',
      flexible: !startTime,
      location: '',
      notes: clause,
    });
  }

  if (!items.length) {
    const date = inferDateFromText(text, reference);
    const startTime = inferTimeFromText(text);
    items.push({
      title: conciseFallbackTitle(text),
      kind: startTime ? 'event' : 'task',
      date: date || dateOnly(reference),
      start_time: startTime,
      duration_min: inferDuration(text),
      deadline: '',
      priority: 'medium',
      flexible: !startTime,
      location: '',
      notes: text,
    });
  }

  return {
    action: 'add',
    cancellation_query: '',
    assistant_message:
      items.length > 1
        ? 'I separated your request into ' + items.length + ' calendar items.'
        : 'I added the calendar item.',
    items,
  };
}

function normalizeExistingEvents(events) {
  return (Array.isArray(events) ? events : [])
    .map((event) => {
      const start = parseFloating(event.start);
      const end = parseFloating(event.end);
      if (!start || !end) return null;
      return {
        title: event.title || 'Busy',
        start,
        end,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

function overlaps(start, end, interval) {
  return start < interval.end && end > interval.start;
}

function findOpenSlot({
  earliest,
  durationMin,
  deadline,
  busy,
  preferredTime,
}) {
  let candidate = new Date(earliest.getTime());
  const maxSearch = deadline || addDays(candidate, 14);

  if (preferredTime) {
    const parts = preferredTime.split(':').map(Number);
    if (parts.length >= 2 && parts.every((part) => !Number.isNaN(part))) {
      const preferred = setUtcTime(candidate, parts[0], parts[1]);
      if (preferred > candidate) candidate = preferred;
    }
  }

  while (candidate < maxSearch) {
    const dayStart = setUtcTime(candidate, 8, 0);
    const dayEnd = setUtcTime(candidate, 21, 0);

    if (candidate < dayStart) candidate = dayStart;

    const proposedEnd = addMinutes(candidate, durationMin);
    if (proposedEnd > dayEnd) {
      candidate = setUtcTime(addDays(candidate, 1), 8, 0);
      continue;
    }

    if (deadline && proposedEnd > deadline) return null;

    const collision = busy.find((interval) => overlaps(candidate, proposedEnd, interval));
    if (!collision) {
      return { start: candidate, end: proposedEnd };
    }

    candidate = addMinutes(collision.end, 15);
  }

  return null;
}

function findLatestOpenSlot({
  earliest,
  durationMin,
  deadline,
  busy,
}) {
  if (!deadline) return null;

  let candidateEnd = new Date(deadline.getTime());
  const stepMinutes = 15;

  while (candidateEnd > earliest) {
    const dayStart = setUtcTime(candidateEnd, 8, 0);
    const dayEnd = setUtcTime(candidateEnd, 21, 0);

    if (candidateEnd > dayEnd) {
      candidateEnd = dayEnd;
    }

    const candidateStart = addMinutes(candidateEnd, -durationMin);

    if (candidateStart < dayStart) {
      const previousDay = addDays(candidateEnd, -1);
      candidateEnd = setUtcTime(previousDay, 21, 0);
      continue;
    }

    if (candidateStart < earliest) return null;

    const collision = busy.find((interval) => overlaps(candidateStart, candidateEnd, interval));

    if (!collision) {
      return {
        start: candidateStart,
        end: candidateEnd,
      };
    }

    candidateEnd = addMinutes(collision.start, -stepMinutes);
  }

  return null;
}

function scheduleItems(items, existingEvents, referenceLocal) {
  const reference = parseFloating(referenceLocal) || new Date();
  const busy = normalizeExistingEvents(existingEvents);
  const scheduled = [];
  const conflicts = [];
  const unscheduled = [];

  const fixed = items.filter((item) => item.start_time);
  const flexible = items
    .filter((item) => !item.start_time)
    .sort((a, b) => {
      const score = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (score[b.priority] || 2) - (score[a.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

  fixed.forEach((item) => {
    const targetDate = item.date || dateOnly(reference);
    const start = parseFloating(targetDate + 'T' + item.start_time);
    if (!start) {
      unscheduled.push({ title: item.title, reason: 'Invalid start time' });
      return;
    }

    const end = addMinutes(start, Math.max(15, item.duration_min || 60));
    const collision = busy.find((interval) => overlaps(start, end, interval));

    if (collision) {
      conflicts.push({
        title: item.title,
        message: 'Conflicts with ' + collision.title,
      });
    }

    scheduled.push({
      title: item.title,
      start: formatFloating(start),
      end: formatFloating(end),
      kind: item.kind || 'event',
      priority: item.priority || 'medium',
      location: item.location || '',
      notes: item.notes || '',
      conflict: Boolean(collision),
      source: 'assistant',
    });

    busy.push({ title: item.title, start, end });
    busy.sort((a, b) => a.start - b.start);
  });

  flexible.forEach((item) => {
    const targetDate = item.date || dateOnly(reference);
    const targetDay = parseFloating(targetDate + 'T00:00');
    const earliest = sameFloatingDay(targetDay, reference)
      ? new Date(Math.max(reference.getTime(), setUtcTime(reference, 8, 0).getTime()))
      : setUtcTime(targetDay, 8, 0);

    let deadline = null;
    if (item.deadline) {
      deadline = parseFloating(item.deadline);
    } else if (item.date) {
      deadline = setUtcTime(targetDay, 21, 0);
    }

    const durationMin = Math.max(15, item.duration_min || 60);

    const slot = item.deadline
      ? findLatestOpenSlot({
          earliest,
          durationMin,
          deadline,
          busy,
        })
      : findOpenSlot({
          earliest,
          durationMin,
          deadline,
          busy,
          preferredTime: item.preferred_time || '',
        });

    if (!slot) {
      unscheduled.push({
        title: item.title,
        reason: item.deadline
          ? 'No available slot before the deadline'
          : 'No available slot found in the search window',
      });
      return;
    }

    scheduled.push({
      title: item.title,
      start: formatFloating(slot.start),
      end: formatFloating(slot.end),
      kind: 'task',
      priority: item.priority || 'medium',
      location: item.location || '',
      notes: item.notes || '',
      conflict: false,
      source: 'assistant',
    });

    busy.push({ title: item.title, start: slot.start, end: slot.end });
    busy.sort((a, b) => a.start - b.start);
  });

  return { scheduled, conflicts, unscheduled };
}

const plannerSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    action: { type: 'string', enum: ['add', 'cancel'] },
    cancellation_query: { type: 'string' },
    assistant_message: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          kind: { type: 'string', enum: ['event', 'task'] },
          date: { type: 'string' },
          start_time: { type: 'string' },
          duration_min: { type: 'integer', minimum: 15, maximum: 720 },
          deadline: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          flexible: { type: 'boolean' },
          location: { type: 'string' },
          notes: { type: 'string' },
        },
        required: [
          'title',
          'kind',
          'date',
          'start_time',
          'duration_min',
          'deadline',
          'priority',
          'flexible',
          'location',
          'notes',
        ],
      },
    },
  },
  required: ['action', 'cancellation_query', 'assistant_message', 'items'],
};

const suggestionsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    suggestions: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          duration_min: { type: 'integer', minimum: 15, maximum: 240 },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          preferred_time: { type: 'string' },
          reason: { type: 'string' },
          category: { type: 'string' },
        },
        required: [
          'title',
          'duration_min',
          'priority',
          'preferred_time',
          'reason',
          'category',
        ],
      },
    },
  },
  required: ['summary', 'suggestions'],
};

app.get('/api/ai-diagnostic', async (req, res) => {
  if (!aiApiKey) {
    return res.status(503).json({
      ok: false,
      provider: aiProvider,
      model: aiModel,
      error: 'No AI API key is configured.',
    });
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      ok: { type: 'boolean' },
    },
    required: ['ok'],
  };

  try {
    const result = await callStructuredAI(
      'planwise_diagnostic',
      schema,
      'Return {"ok": true}.',
      { ping: 'planwise' }
    );

    return res.json({
      ok: Boolean(result && result.ok),
      provider: aiProvider,
      model: aiModel,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      provider: aiProvider,
      model: aiModel,
      error: error.message,
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(aiApiKey),
    aiProvider,
    aiBaseUrl,
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    model: aiModel,
  });
});

app.post('/api/plan-request', async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  const referenceLocal = req.body.referenceLocal || '';
  const timezone = req.body.timezone || 'local';
  const existingEvents = Array.isArray(req.body.events) ? req.body.events : [];

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  const instructions = [
    'You are PlanWise, an AI calendar and time-management assistant.',
    'Extract every distinct appointment, event, task, deadline, travel block, and cancellation request from the user message.',
    'The user may mix Chinese and English.',
    'Use the provided reference local datetime and timezone for relative dates.',
    'For fixed appointments, provide date as YYYY-MM-DD and start_time as HH:mm.',
    'For flexible tasks, leave start_time empty and provide a deadline when the user states or clearly implies one.',
    'Phrases such as before the interview, 面试前, by 5pm, 5点前, 截止到, before X are deadlines, not fixed start times. Set start_time to an empty string and set deadline to the exact cutoff.',
    'When a flexible task refers to an existing calendar event, such as 面试前准备2小时 or prepare for 2 hours before the ByteDance interview, resolve the referenced event from existingEvents and set the task deadline to that event start time.',
    'Do not choose a fixed start time for deadline-only work unless the user explicitly asks for one.',
    'Deadline format must be YYYY-MM-DDTHH:mm:00 or an empty string.',
    'Do not invent obligations. When duration is missing, estimate a conservative duration between 30 and 90 minutes.',
    'If travel time is explicitly mentioned, create a separate task/event for it so the scheduler can reserve the time.',
    'Return action=cancel only when the user is asking to remove an existing calendar item.',
    'Resolve discourse-relative dates such as 前一天 / the day before against the date of the immediately related appointment when the sentence makes that relationship clear.',
    'A comma-separated sentence can contain multiple independent obligations. Create one item per obligation instead of copying the whole sentence into one title.',
    'Titles must be short calendar labels, usually 2 to 8 words or short Chinese phrases. Example: 字节跳动面试, 提交最新版简历. Never use the entire user message as a title.',
    'Keep assistant_message concise and useful.',
  ].join(' ');

  let extracted;
  let plannerMode = 'openai';
  let aiError = '';

  try {
    extracted = await callStructuredAI(
      'planwise_planner',
      plannerSchema,
      instructions,
      {
        text,
        referenceLocal,
        timezone,
        existingEvents,
      }
    );
  } catch (error) {
    aiError = error.message;
    plannerMode = 'fallback';
    console.error('AI planner failed, using fallback:', error.message);
  }

  if (!extracted) {
    plannerMode = 'fallback';
    extracted = fallbackPlanner(text, referenceLocal);
  }

  if (extracted.action === 'cancel') {
    return res.json({
      action: 'cancel',
      cancellation_query: extracted.cancellation_query,
      assistant_message: extracted.assistant_message,
      extracted_items: [],
      scheduled_events: [],
      conflicts: [],
      unscheduled: [],
    });
  }

  const result = scheduleItems(extracted.items || [], existingEvents, referenceLocal);

  return res.json({
    action: 'add',
    cancellation_query: '',
    assistant_message: extracted.assistant_message,
    extracted_items: extracted.items || [],
    scheduled_events: result.scheduled,
    conflicts: result.conflicts,
    unscheduled: result.unscheduled,
    planner_mode: plannerMode,
    ai_error: plannerMode === 'fallback' ? aiError : '',
  });
});

app.post('/api/daily-suggestions', async (req, res) => {
  const journalEntries = Array.isArray(req.body.journalEntries)
    ? req.body.journalEntries
    : [];
  const events = Array.isArray(req.body.events) ? req.body.events : [];
  const today = req.body.today || '';
  const referenceLocal = req.body.referenceLocal || (today ? today + 'T08:00:00' : '');
  const timezone = req.body.timezone || 'local';

  const uniqueDays = new Set(journalEntries.map((entry) => entry.date).filter(Boolean));
  if (uniqueDays.size < 7) {
    return res.status(400).json({
      error: 'PlanWise needs at least 7 journal days before generating daily suggestions.',
      learnedDays: uniqueDays.size,
    });
  }

  const recentEntries = journalEntries
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 14);

  const instructions = [
    'You are PlanWise, a personalized daily planning assistant.',
    'Infer routine patterns only from the supplied journal and schedule history.',
    'Generate 3 to 5 optional, concrete tasks for today that fit the user schedule and observed habits.',
    'Do not invent meetings, deadlines, medical needs, or external obligations.',
    'Prefer realistic self-management tasks such as focused work, study, exercise, planning, admin, breaks, or reflection when supported by the history.',
    'preferred_time must be HH:mm or an empty string.',
    'Keep each reason to one short sentence.',
  ].join(' ');

  let generated;

  try {
    generated = await callStructuredAI(
      'planwise_daily_suggestions',
      suggestionsSchema,
      instructions,
      {
        today,
        timezone,
        journalEntries: recentEntries,
        events,
      }
    );
  } catch (error) {
    console.error('Daily suggestion AI failed, using fallback:', error.message);
  }

  if (!generated) {
    generated = {
      summary: 'PlanWise is using a simple local routine until an OpenAI key is configured.',
      suggestions: [
        {
          title: 'Top-priority focus block',
          duration_min: 60,
          priority: 'high',
          preferred_time: '09:00',
          reason: 'Protect a focused block for the most important task of the day.',
          category: 'focus',
        },
        {
          title: 'Admin and follow-up block',
          duration_min: 30,
          priority: 'medium',
          preferred_time: '14:00',
          reason: 'Batch small tasks so they do not fragment your focus time.',
          category: 'admin',
        },
        {
          title: 'Daily review',
          duration_min: 20,
          priority: 'low',
          preferred_time: '20:00',
          reason: 'Close the loop by reviewing what was completed and what should move forward.',
          category: 'reflection',
        },
      ],
    };
  }

  const taskItems = generated.suggestions.map((suggestion) => ({
    title: suggestion.title,
    kind: 'task',
    date: today,
    start_time: '',
    duration_min: suggestion.duration_min,
    deadline: '',
    priority: suggestion.priority,
    flexible: true,
    preferred_time: suggestion.preferred_time,
    location: '',
    notes: suggestion.reason,
  }));

  const schedule = scheduleItems(taskItems, events, referenceLocal);

  return res.json({
    summary: generated.summary,
    suggestions: generated.suggestions,
    scheduled_events: schedule.scheduled,
    conflicts: schedule.conflicts,
    unscheduled: schedule.unscheduled,
  });
});

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on the server.' });
  }

  const plan = req.body.plan;
  if (!['premium', 'lifetime'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan.' });
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return res.status(500).json({ error: 'Stripe price ID is missing for ' + plan + '.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: plan === 'premium' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        clientUrl +
        '/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=' +
        encodeURIComponent(plan),
      cancel_url: clientUrl + '/membership',
      metadata: { plan },
    });

    return res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe checkout session failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/checkout-session/:sessionId', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured on the server.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    return res.json({
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      plan: session.metadata && session.metadata.plan ? session.metadata.plan : '',
      verified:
        session.status === 'complete' &&
        (session.payment_status === 'paid' || session.mode === 'subscription'),
    });
  } catch (error) {
    console.error('Stripe session verification failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log('PlanWise server running on port ' + port);
});
