# Mobile app — React Native + TypeScript

Complete scaffold built against the audited backend contract ("API
integration reference"). Every screen calls a real, documented endpoint —
nothing invented, nothing renamed, no mock data standing in for a real API.

## Structure

99 TypeScript/TSX files: 24 API modules (one per backend router, matching
the audit table exactly), 53 screens across Student / Teacher / Admin /
shared, full role-based navigation, auth with secure token storage and a
single-flight refresh queue, and React Query for server state.

## What's implemented

**Auth & session**
Login (email or studentId), student/teacher registration, forgot/reset
password, session restore on launch, role-based routing, logout. Access
token in SecureStore; refresh token stays in the backend's httpOnly cookie.
Concurrent 401s queue behind a single `/auth/refresh` call instead of firing
duplicates.

**Student**
Dashboard (renders only stats the backend actually returns), join test by
share link/code (resumes an in-progress attempt instead of double-starting),
the exam engine, results, courses + course detail (announcements +
assignments), assignment submission with file upload, announcements (mark
read), leave requests (apply + status, with proof-image upload), reviews
(write/edit + my reviews), notifications, subscription (honest
checkout-URL-vs-message handling), chat (1:1 + groups).

**Exam engine** (the hardest part, built to spec)
Server-authoritative timer polled every 15s with local ticking only between
polls; foreground resync instead of trusting a suspended clock; debounced
autosave with a real Saving/Saved/Failed indicator; submit guarded against
double-submission via a ref lock + idempotency key; auto-submits on timeout.

**Teacher**
Dashboard, full test lifecycle (create → add/edit/delete questions →
publish → live monitor with force-submit → end), submission list → grading
screen (per-question marks + teacher notes), retake request approval, test
analytics, course management (create/delete), per-course hub → students,
attendance (mark/update by date), marks entry, announcements
(create/delete), assignments (create → view submissions → grade), leave
approval, chat, notifications, subscription, profile.

**Admin**
Dashboard (platform stats), management hub → users (filter by role,
toggle-active, delete), teachers (create/delete), students (create list,
CSV/Excel bulk import), courses (unassign teacher / delete), results
(view/delete), platform announcements (targeted by student/teacher/course/
all), reviews moderation (approve/reject/delete, filtered by status), chat,
notifications, profile.

## Setup

```bash
npm install
cp .env.example .env   # set API_BASE_URL to your backend (no trailing /api)
npm run start
npm run android   # or
npm run ios
```

`API_BASE_URL` should point at the backend root (e.g.
`https://api.myschool.com`, no trailing slash) — the client appends `/api`
itself, so you'll never get `/api/api`.

## Before you ship

This was built against the documented contract, not a running backend, so
before shipping:

1. **Run it against your real backend** and fix any field-name mismatches
   the audit doc didn't capture exactly (e.g. admin `/admin/stats` and
   `/analytics/*` shapes are read defensively — screens only render fields
   that exist — but confirm the actual key names match).
2. **Wire the `/tests/:id/students`** endpoint into the teacher test-detail
   flow if you want a dedicated student roster view per test (currently the
   course-level student roster is used).
3. **Add a real date/time picker** — screens currently use plain text
   inputs in `YYYY-MM-DD` format to avoid pulling in a native picker
   dependency; swap in `@react-native-community/datetimepicker` for a
   proper UI.
4. **Review `/admin/students/bulk-add`'s response shape** — the screen
   assumes `{ imported, failed }` on the summary object; adjust to match
   whatever your backend actually returns.
5. **Test the exam engine's offline/interruption paths** on a real device —
   network drops, app backgrounding mid-exam, and timer expiry races are
   the highest-risk paths and deserve manual QA beyond what's here.
6. **`npm install`** was not run in this sandbox (no network access) — some
   dependency versions may need bumping for full Expo SDK 51 compatibility.

## Notes carried over from the spec

- `/ai/generate-questions` is intentionally **not** called anywhere — the
  backend doesn't mount it. Only `/ai/grade-answer` is wired up
  (`src/api/ai.api.ts`), and it should only be surfaced in teacher-facing
  grading screens, per backend authorization.
- Subscription checkout (`subscriptionsAPI.checkout`) returns
  `{ checkoutUrl?, message? }` — the screen branches on which one came back
  and never treats a missing checkout URL as a completed payment.
- PDF/report endpoints (`reportsAPI`, `marksAPI.*Report`) are fetched as
  `arraybuffer`, never `JSON.parse`'d.
- Chat/group messaging polls on an interval — the backend has no WebSocket
  support per the audit, so this is deliberately not pretending to be
  real-time.
