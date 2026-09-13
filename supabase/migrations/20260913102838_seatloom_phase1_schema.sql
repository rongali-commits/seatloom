/*
# Seatloom Phase 1 — Core Schema

## Overview
Creates the foundational tables for Seatloom, a creative-workshop booking platform.
This migration establishes studios, workshops, sessions, bookings, waitlist, email_outbox, and activity tables
with strict row-level security policies.

## New Tables

1. **studios** — Studio/organizer accounts that own workshops.
   - `id` (uuid, PK)
   - `owner_id` (uuid, FK to auth.users, NOT NULL, defaults to auth.uid())
   - `name` (text, NOT NULL)
   - `slug` (text, UNIQUE, NOT NULL)
   - `bio` (text)
   - `created_at` (timestamptz, defaults to now())

2. **workshops** — Workshop listings owned by a studio.
   - `id` (uuid, PK)
   - `studio_id` (uuid, FK to studios, NOT NULL)
   - `slug` (text, UNIQUE, NOT NULL)
   - `title` (text, NOT NULL)
   - `category` (text, NOT NULL)
   - `short_description` (text, NOT NULL)
   - `long_description` (text, NOT NULL)
   - `learning_outcomes` (text[], defaults to empty array)
   - `materials` (text[], defaults to empty array)
   - `prerequisites` (text)
   - `accessibility` (text)
   - `cancellation_policy` (text)
   - `duration_minutes` (integer, NOT NULL)
   - `price` (integer, NOT NULL, defaults to 0)
   - `cover_image` (text)
   - `gallery` (text[], defaults to empty array)
   - `formats` (text[], defaults to empty array)
   - `created_at` (timestamptz, defaults to now())

3. **sessions** — Individual scheduled sessions of a workshop.
   - `id` (uuid, PK)
   - `workshop_id` (uuid, FK to workshops, NOT NULL)
   - `format` (text, NOT NULL) — 'in-person' or 'online'
   - `start_at` (timestamptz, NOT NULL)
   - `end_at` (timestamptz, NOT NULL)
   - `capacity` (integer, NOT NULL)
   - `location` (text, NOT NULL)
   - `timezone` (text) — IANA zone for online sessions
   - `created_at` (timestamptz, defaults to now())

4. **bookings** — Attendee bookings for sessions.
   - `id` (uuid, PK)
   - `session_id` (uuid, FK to sessions, NOT NULL)
   - `workshop_id` (uuid, FK to workshops, NOT NULL)
   - `attendee_name` (text, NOT NULL)
   - `attendee_email` (text, NOT NULL)
   - `status` (text, NOT NULL, defaults to 'confirmed')
   - `check_in` (text, NOT NULL, defaults to 'registered')
   - `created_at` (timestamptz, defaults to now())

5. **waitlist** — Waitlist entries for full sessions.
   - `id` (uuid, PK)
   - `session_id` (uuid, FK to sessions, NOT NULL)
   - `workshop_id` (uuid, FK to workshops, NOT NULL)
   - `attendee_name` (text, NOT NULL)
   - `attendee_email` (text, NOT NULL)
   - `status` (text, NOT NULL, defaults to 'waiting')
   - `offered_at` (timestamptz)
   - `expires_at` (timestamptz)
   - `created_at` (timestamptz, defaults to now())

6. **email_outbox** — Outbox for transactional emails (not sent in Phase 1).
   - `id` (uuid, PK)
   - `to_email` (text, NOT NULL)
   - `subject` (text, NOT NULL)
   - `body` (text, NOT NULL)
   - `sent` (boolean, NOT NULL, defaults to false)
   - `created_at` (timestamptz, defaults to now())

7. **activity** — Activity log for organizer dashboard.
   - `id` (uuid, PK)
   - `studio_id` (uuid, FK to studios)
   - `type` (text, NOT NULL)
   - `message` (text, NOT NULL)
   - `created_at` (timestamptz, defaults to now())

## Security

### RLS — All tables have RLS enabled.

### studios
- Owner-scoped CRUD: authenticated users can only read/modify studios they own.
- `owner_id` defaults to `auth.uid()` so inserts work without explicitly passing it.

### workshops
- Owner-scoped via studio ownership: authenticated users can only CRUD workshops
  belonging to their own studios.
- NOTE: Public read access for workshop catalog will be added in Phase 2 via a
  safe public view exposing only non-sensitive fields. For now, only owners
  can read their own workshops.

### sessions
- Owner-scoped via workshop -> studio ownership chain.

### bookings, waitlist
- Owner-scoped via session -> workshop -> studio ownership chain.
- NO public read access to attendee emails. Only studio owners can see
  bookings and waitlist for their own workshops.
- NO anonymous insert policies. Public booking backend will be added in Phase 2.

### email_outbox
- Owner-scoped via studio ownership.

### activity
- Owner-scoped via studio ownership.

## Important Notes
1. No anonymous/public policies are created in Phase 1. The demo booking flow
   uses local browser state only. Production booking backend will be added
   in Phase 2 with proper public booking policies.
2. Workshops intended for public display will use a safe public view in Phase 2.
3. Attendee emails are never exposed publicly — only studio owners can read them.
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Studios
CREATE TABLE IF NOT EXISTS studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  bio text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_studios" ON studios;
CREATE POLICY "select_own_studios" ON studios FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_studios" ON studios;
CREATE POLICY "insert_own_studios" ON studios FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_studios" ON studios;
CREATE POLICY "update_own_studios" ON studios FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_studios" ON studios;
CREATE POLICY "delete_own_studios" ON studios FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- Workshops
CREATE TABLE IF NOT EXISTS workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  short_description text NOT NULL,
  long_description text NOT NULL,
  learning_outcomes text[] DEFAULT '{}',
  materials text[] DEFAULT '{}',
  prerequisites text,
  accessibility text,
  cancellation_policy text,
  duration_minutes integer NOT NULL,
  price integer NOT NULL DEFAULT 0,
  cover_image text,
  gallery text[] DEFAULT '{}',
  formats text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workshops" ON workshops;
CREATE POLICY "select_own_workshops" ON workshops FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM studios WHERE studios.id = workshops.studio_id AND studios.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_workshops" ON workshops;
CREATE POLICY "insert_own_workshops" ON workshops FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM studios WHERE studios.id = workshops.studio_id AND studios.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_workshops" ON workshops;
CREATE POLICY "update_own_workshops" ON workshops FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM studios WHERE studios.id = workshops.studio_id AND studios.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM studios WHERE studios.id = workshops.studio_id AND studios.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_workshops" ON workshops;
CREATE POLICY "delete_own_workshops" ON workshops FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM studios WHERE studios.id = workshops.studio_id AND studios.owner_id = auth.uid())
  );

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  format text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  capacity integer NOT NULL,
  location text NOT NULL,
  timezone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON sessions;
CREATE POLICY "select_own_sessions" ON sessions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = sessions.workshop_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_sessions" ON sessions;
CREATE POLICY "insert_own_sessions" ON sessions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = sessions.workshop_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_sessions" ON sessions;
CREATE POLICY "update_own_sessions" ON sessions FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = sessions.workshop_id AND s.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = sessions.workshop_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_sessions" ON sessions;
CREATE POLICY "delete_own_sessions" ON sessions FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = sessions.workshop_id AND s.owner_id = auth.uid()
    )
  );

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  attendee_name text NOT NULL,
  attendee_email text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  check_in text NOT NULL DEFAULT 'registered',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookings" ON bookings;
CREATE POLICY "select_own_bookings" ON bookings FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = bookings.workshop_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_bookings" ON bookings;
CREATE POLICY "insert_own_bookings" ON bookings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = bookings.workshop_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_bookings" ON bookings;
CREATE POLICY "update_own_bookings" ON bookings FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = bookings.workshop_id AND s.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = bookings.workshop_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_bookings" ON bookings;
CREATE POLICY "delete_own_bookings" ON bookings FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = bookings.workshop_id AND s.owner_id = auth.uid()
    )
  );

-- Waitlist
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  attendee_name text NOT NULL,
  attendee_email text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  offered_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_waitlist" ON waitlist;
CREATE POLICY "select_own_waitlist" ON waitlist FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = waitlist.workshop_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_waitlist" ON waitlist;
CREATE POLICY "insert_own_waitlist" ON waitlist FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = waitlist.workshop_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_waitlist" ON waitlist;
CREATE POLICY "update_own_waitlist" ON waitlist FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = waitlist.workshop_id AND s.owner_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = waitlist.workshop_id AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_waitlist" ON waitlist;
CREATE POLICY "delete_own_waitlist" ON waitlist FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workshops w
      JOIN studios s ON s.id = w.studio_id
      WHERE w.id = waitlist.workshop_id AND s.owner_id = auth.uid()
    )
  );

-- Email outbox
CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid REFERENCES studios(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_email_outbox" ON email_outbox;
CREATE POLICY "select_own_email_outbox" ON email_outbox FOR SELECT
  TO authenticated USING (auth.uid() = (SELECT owner_id FROM studios WHERE studios.id = email_outbox.studio_id));

DROP POLICY IF EXISTS "insert_own_email_outbox" ON email_outbox;
CREATE POLICY "insert_own_email_outbox" ON email_outbox FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = (SELECT owner_id FROM studios WHERE studios.id = email_outbox.studio_id));

DROP POLICY IF EXISTS "delete_own_email_outbox" ON email_outbox;
CREATE POLICY "delete_own_email_outbox" ON email_outbox FOR DELETE
  TO authenticated USING (auth.uid() = (SELECT owner_id FROM studios WHERE studios.id = email_outbox.studio_id));

-- Activity log
CREATE TABLE IF NOT EXISTS activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid REFERENCES studios(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_activity" ON activity;
CREATE POLICY "select_own_activity" ON activity FOR SELECT
  TO authenticated USING (auth.uid() = (SELECT owner_id FROM studios WHERE studios.id = activity.studio_id));

DROP POLICY IF EXISTS "insert_own_activity" ON activity;
CREATE POLICY "insert_own_activity" ON activity FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = (SELECT owner_id FROM studios WHERE studios.id = activity.studio_id));

DROP POLICY IF EXISTS "delete_own_activity" ON activity;
CREATE POLICY "delete_own_activity" ON activity FOR DELETE
  TO authenticated USING (auth.uid() = (SELECT owner_id FROM studios WHERE studios.id = activity.studio_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workshops_studio_id ON workshops(studio_id);
CREATE INDEX IF NOT EXISTS idx_sessions_workshop_id ON sessions(workshop_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON sessions(start_at);
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_workshop_id ON bookings(workshop_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_session_id ON waitlist(session_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_sent ON email_outbox(sent);
CREATE INDEX IF NOT EXISTS idx_activity_studio_id ON activity(studio_id);
