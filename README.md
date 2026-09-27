# PlanWise

PlanWise is an AI calendar assistant that combines natural-language time management with a daily journal.

The product has two learning loops:

1. **Time Manager** — users can describe appointments, tasks, deadlines, and travel time in natural language. PlanWise extracts the request, detects fixed-time conflicts, and schedules flexible work into open calendar slots.
2. **Daily Journal → Today Plan** — users journal what they completed, what slipped, their energy, and tomorrow's focus. After 7 distinct journal days, Premium users can generate optional task suggestions based on their recent routine and existing calendar.

## Core product

### Calendar
- Natural-language event and task entry
- Chinese, English, and mixed-language input
- Fixed appointments
- Flexible tasks
- Deadlines
- Travel blocks
- Existing-calendar conflict detection
- Open-slot scheduling
- Event cancellation

### Daily Journal
- Mood
- Energy
- Completed work
- Unfinished work
- Reflection
- Tomorrow's focus
- 7-day learning progress

### Today Plan
After 7 journal days, PlanWise can generate 3–5 optional daily tasks based on recent journal history and today's calendar. Suggestions are placed into open time and can be added to the calendar with one click.

### Membership and Stripe
- Basic: Calendar + Daily Journal
- Premium: Today Plan
- Lifetime: Today Plan with one-time payment
- Stripe Checkout is created and verified on the backend.

## Architecture

```
React client
   |
   | REST
   v
Express server
   |
   +-- OpenAI Responses API
   |
   +-- Deterministic scheduling / conflict checks
   |
   +-- Stripe Checkout
```

OpenAI and Stripe secret keys live only on the server.

## Run locally

Requirements:
- Node.js 18+
- npm

### 1. Server

```bash
cd server
cp .env.example .env
npm install
npm start
```

Configure `server/.env`:

```
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
STRIPE_SECRET_KEY=...
STRIPE_PRICE_ID_MONTHLY=...
STRIPE_PRICE_ID_LIFETIME=...
CLIENT_URL=http://localhost:3000
```

The app still supports a simple local parser and fallback Today Plan when `OPENAI_API_KEY` is not configured.

### 2. Client

```bash
cd client
cp .env.example .env
npm install
npm start
```

The client expects:

```
REACT_APP_API_BASE_URL=http://localhost:4000/api
```

Because Tailwind was previously used in the source without being declared directly, run `npm install` once after pulling this branch so the lockfile is refreshed.

## Main source files

```
client/src/components/Features/SmartEventEntry.js
client/src/components/Features/DailyJournal.js
client/src/components/Features/TodayPlan.js
client/src/Services/openAIservice.js

server/server.js
```

## Data storage

This prototype keeps user calendar and journal data in browser `localStorage`, keyed by the local username. Authentication is still prototype-level and should be replaced with a real database/auth layer before production deployment.

## Security

Do not commit real `.env` files. Rotate any OpenAI or Stripe keys that were previously committed to Git history.
