# Seatloom

A focused workshop booking application for creative studios. Built with Bolt, React, TypeScript, Vite, Tailwind CSS and Supabase/PostgreSQL.

## Scope

- Fictional, no-login catalogue and organizer demo with local browser persistence.
- Email-authenticated studio creation and workshop editing/publication.
- Session scheduling, free reservations, attendee cancellation and rescheduling.
- FIFO waitlists with 15-minute held-seat offers.
- Organizer rosters, capacity changes, session cancellation and ticket-token check-in.
- Responsive layouts, keyboard-accessible dialogs and reduced-motion support.

Not included: payments, subscriptions, camera scanning, calendar integrations, recurring schedules, automatic booking-email delivery or an always-running queue worker. A QR code contains a ticket identifier; an organizer can paste a scanned token or search by name. Offers reconcile on booking activity and waitlist refresh. Authentication emails are separate from the booking outbox.

## Run locally

Use Node 22 LTS or newer. Run `npm ci`, then configure a private `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never put a service-role key in a `VITE_` variable. Apply migrations in filename order to your own Supabase project. Keep email confirmation enabled and set the site URL and allowed redirect URL to your deployed origin.

Run `npm run dev`. Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run build` and `npm audit` before release. Configure SPA fallback to `index.html` on any host.

## Data boundaries

All attendee records are private under row-level security. Public catalogue RPCs expose published workshops and session availability, not rosters. Booking writes occur through transactional RPCs; sessions are locked before allocating seats. Reschedules lock both sessions in stable order, and failed moves retain the original reservation. Private security-definer helpers are not exposed to anonymous callers. Attendee booking functions require a confirmed account.

Demo workshops, instructors, studio addresses and biographies are fictional. The three workshop photos were generated specifically for this demonstration and are stored locally under `public/assets`. No real client affiliation or outcome is claimed.

## Verification completed locally

30 domain tests, including eight independent release regressions. Separate isolated PostgreSQL/PGlite harness: 27 checks covering real functions, permissions, capacity, waitlist fairness, expiry, cancellation, rescheduling and private-data isolation. The database harness is single-connection; it is not evidence of a multi-connection load test or live email delivery.

## Operating responsibly

Use free workshops only. Review privacy and terms for your actual business and jurisdiction before accepting customers. Plan database backups, retention and deletion procedures, mail-provider setup, rate limits and monitoring for commercial operation. Do not replay historical unsent outbox rows without reviewing recipients and content. Source ownership and any sale licence are separate from the app's usage terms.
