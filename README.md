# EaseAT

A student attendance manager built around one fact most trackers get wrong: **the same subject can meet more than once a day, and each meeting is its own class.**

Monday 09:00 DSA and Monday 14:00 DSA are two separate attendance sessions, counted independently.

- **Frontend** — React 18, Vite, React Router, plain CSS
- **Backend** — Node.js, Express, REST
- **Database** — PostgreSQL via Prisma
- **Auth** — JWT + bcrypt, every query scoped to the signed-in user
- **AI** — optional layer for PDF calendar extraction, natural-language timetable entry, and a grounded assistant. The app is fully usable with it switched off.

---

## Quick start

### 1. PostgreSQL

```bash
docker compose up -d        # starts postgres:16 on :5432
```

Or point `DATABASE_URL` at any Postgres you already have.

### 2. Backend

```bash
cd backend
cp .env.example .env        # set JWT_SECRET and DATABASE_URL
npm install
npx prisma migrate dev --name init
npm run seed                # optional demo data
npm run dev                 # http://localhost:4000
```

Seed login: `demo@attendly.app` / `demo1234` — six weeks of history across four subjects, with two DSA classes every Monday.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Vite proxies `/api` to the backend, so no CORS setup is needed in development.

### 4. Optional: turn on the AI features

Add to `backend/.env`:

```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

The key stays on the server. The browser never sees it and never calls the model directly.

---

## How the attendance engine works

```
subjects → timetable_entries → attendance_sessions → percentages & predictions
                    ↑                    ↑
            academic_calendar     student marks
```

1. **Sessions are generated from the timetable**, one per slot per date, skipping dates the academic calendar marks as a holiday or vacation. Generation is idempotent — rerunning it never duplicates a session or overwrites a mark.
2. **Only `PRESENT` and `ABSENT` count.** `CANCELLED`, `NO_CLASS` and unmarked `PENDING` sessions sit in the history and are invisible to the maths, which is why a cancelled class is harmless.
3. **A confirmed `WORKING_DAY` overrides a holiday** on the same date — colleges announce compensatory Saturdays this way.
4. **Rescheduling** cancels the original session and creates a new countable one, linked through `rescheduled_classes`, so both halves stay in the record.
5. **Every projection is arithmetic**, in `services/attendance-math.service.js`, with no AI anywhere near it:

| Question | Formula |
| --- | --- |
| How many can I miss? | largest `k` where `present / (total + k) ≥ r` |
| How many must I attend? | smallest `k` where `(present + k) / (total + k) ≥ r` |
| If I attend/miss the next n? | recount at `present + n` or `absent + n` |

With 24 present and 6 absent against a 75% requirement: 80% now, 2 classes missable (24/32 = exactly 75%), 72.7% if three are missed.

## What the AI is and is not allowed to do

- It **reads** a snapshot assembled by the deterministic services and phrases an answer. It is told, in the system prompt, never to compute or invent a number.
- PDF extraction writes rows with `verified = false`. Unverified rows are ignored by the session generator until the student confirms them on the review screen.
- Natural-language timetable entry returns a **preview**; nothing is written until the student presses confirm.
- If no API key is configured, those three features report that they are off and the rest of the app continues normally.

---

## Project layout

```
backend/
  prisma/schema.prisma        normalized schema, indexes, unique constraints
  prisma/seed.js              demo student with two Monday DSA classes
  src/config/env.js           typed environment access
  src/middleware/             auth (JWT), zod validation, error shaping
  src/services/
    attendance-math.service.js   pure maths, no I/O
    session.service.js           generation, marking, cancel, reschedule
    attendance.service.js        summaries and predictions
    timetable.service.js         slots, overlap checks
    calendar.service.js          academic calendar + verification
    notification.service.js      in-app alerts, one `deliver` seam for email/push
    upload.service.js            PDF storage + text extraction
    storage/storage.service.js   local disk or Supabase, swappable
    ai/llm.client.js             the only file that calls a model
    ai/ai.service.js             extraction, NL parsing, grounded assistant
  src/controllers/, src/routes/, src/validators/
frontend/
  src/api/client.js           one typed wrapper around fetch
  src/context/                auth + toasts
  src/components/             layout, guards, meters, modal, helpers
  src/pages/                  11 pages, listed below
```

## API

All routes are prefixed `/api`. Everything except register/login requires `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | account |
| GET/PUT | `/auth/me`, `/auth/password` | profile, password |
| GET/POST | `/subjects` | list, create |
| PUT/DELETE | `/subjects/:id` | edit, delete |
| GET/POST | `/timetable`, `/timetable/bulk` | weekly slots |
| PUT/DELETE | `/timetable/:id` | edit, remove slot |
| GET/POST | `/attendance` | sessions, one-off class |
| POST | `/attendance/generate` | build sessions for a date range |
| POST | `/attendance/bulk` | mark many at once |
| PUT | `/attendance/:id` | mark present/absent/cancelled |
| POST | `/attendance/:id/reschedule` | move a class |
| GET | `/attendance/today`, `/attendance/summary` | dashboard figures |
| GET | `/attendance/predictions`, `/attendance/:subjectId/prediction` | projections |
| GET/POST | `/calendar`, `/calendar/verify` | events, confirm extracted dates |
| GET | `/calendar/month`, `/calendar/day` | calendar views |
| PUT/DELETE | `/calendar/:id` | edit, delete event |
| POST/GET/DELETE | `/calendar/upload`, `/calendar/uploads`, `/calendar/uploads/:id` | PDF handling |
| GET/POST/PUT/DELETE | `/notifications`, `/notifications/refresh`, `/notifications/:id/read`, `/notifications/read-all` | alerts |
| GET/POST | `/ai/status`, `/ai/facts`, `/ai/assistant`, `/ai/timetable/parse`, `/ai/timetable/confirm` | AI layer |

Errors always come back as `{ "error": { "message", "code", "details"? } }`.

## Pages

Login, Register, Dashboard, Subjects, Timetable, Attendance, Calendar, Academic calendar, Notifications, Assistant, Profile.

## Security

bcrypt hashing, JWT with expiry, zod validation on every body/query/param, Prisma parameterized queries, per-user scoping in every service, helmet, rate limits on auth and AI routes, PDF-only uploads with a size cap, and secrets read only from the environment.

## Not yet built

Email and push delivery (the `deliver` function in `notification.service.js` is the hook), a scheduler to call `/notifications/refresh` without a page load, and an automated test suite. Deployment needs `prisma migrate deploy`, `STORAGE_DRIVER=supabase` for a read-only filesystem, and `CLIENT_ORIGIN` set to the deployed frontend.
