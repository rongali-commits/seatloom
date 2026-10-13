# Seatloom

[![Checks](https://github.com/rongali-commits/seatloom/actions/workflows/ci.yml/badge.svg)](https://github.com/rongali-commits/seatloom/actions/workflows/ci.yml)

**Creative workshop booking, with room for the experience and the operations behind it.**

[Live demo](https://seatloom-workshop-pl-rcs7.bolt.host) Â· [Case study](https://noerong.com/projects/seatloom) Â· [Studio](https://noerong.com) Â· [CI](https://github.com/rongali-commits/seatloom/actions/workflows/ci.yml)

![Seatloom workshop detail with fictional studio content](docs/screenshot.png)

Seatloom connects workshop discovery to free reservations, capacity-aware sessions, FIFO waitlists and a focused organizer workspace. It is an independent Noerong product; the public demo contains fictional workshops and participants.

## Implemented workflow

- Workshop catalogue and session details with availability and time-zone context.
- Reservations, cancellation and supported rescheduling.
- FIFO waitlist offers with a 15-minute claim window.
- Organizer workshop/session management, rosters and attendance check-in.
- Supabase authentication, ownership policies and transactional database functions.
- A separate organizer demo for exploring the interface with fictional records.

Waitlist offers reconcile on relevant actions or refresh. This release does not include payments, automatic booking emails or a background waitlist scheduler. Frontend reducer tests verify demo/domain behavior; database capacity guarantees require the migrations and separate integration verification.

## Run locally

Use Node.js 24 and the committed lockfile.

```bash
npm ci
npm run dev
```

The fictional catalogue and `/demo/organizer` demonstrate the experience. To use authenticated records, copy `.env.example` to `.env.local`, supply a **buyer-owned** Supabase URL and publishable/anon key, and apply `supabase/migrations` in filename order to a new project. Configure auth site and redirect URLs for the frontend origin. Never place a service-role key in a `VITE_` variable.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The domain suites cover reservations, rescheduling, duplicate attendees, mismatched sessions, past sessions, held and expired waitlist offers, and repeated cancellation. CI runs type checking, lint, tests and the production build without production credentials.

## Structure

```text
src/domain/           demo state, reducer and regression tests
src/pages/            catalogue, booking and organizer screens
src/lib/              Supabase and application services
supabase/migrations/  schema, ownership policies and booking functions
```

## Buyer deployment

Deploy `dist` with an SPA fallback. Use a new Supabase project, apply all migrations, configure verified authentication and reliable email delivery, and test ownership isolation, capacity, waitlist order, reservation, rescheduling and cancellation on that installation before real use. Configure backups and operating controls for the buyer's environment.

Supabase public configuration belongs in the two `VITE_` values. Credentials and real participant data do not belong in this repository.

## Source and commercial use

Built by Rongali Chaitanya at Noerong with React, TypeScript, Vite and Supabase. The studio provides commercial source rights separately; public repository visibility does not grant redistribution rights. [Discuss a source kit or implementation](https://noerong.com/contact). Dependencies retain their own licenses.
