/*
# Seatloom Phase 2 — Additive Columns and Constraints

Adds attendee_user_id, publication state, instructor metadata, check-in token,
cancellation state, input constraints, and unique indexes to prevent duplicate
active bookings/waitlist per attendee per session.
*/

-- Studios: instructor metadata
ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS instructor_name text,
  ADD COLUMN IF NOT EXISTS instructor_bio text,
  ADD COLUMN IF NOT EXISTS instructor_photo_url text;

-- Workshops: publication state + instructor metadata
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instructor_name text,
  ADD COLUMN IF NOT EXISTS instructor_bio text,
  ADD COLUMN IF NOT EXISTS instructor_photo_url text;

-- Sessions: cancellation state
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS is_cancelled boolean NOT NULL DEFAULT false;

-- Bookings: attendee identity, check-in token, cancellation timestamp
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS attendee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS check_in_token text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Waitlist: attendee identity
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS attendee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Session capacity and time constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_capacity_positive') THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_capacity_positive CHECK (capacity >= 1);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_start_before_end') THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_start_before_end CHECK (start_at < end_at);
  END IF;
END $$;

-- Unique check_in_token
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_check_in_token_unique') THEN
    CREATE UNIQUE INDEX idx_bookings_check_in_token_unique ON bookings (check_in_token) WHERE check_in_token IS NOT NULL;
  END IF;
END $$;

-- One active booking per attendee per session
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bookings_unique_active_attendee_session') THEN
    CREATE UNIQUE INDEX idx_bookings_unique_active_attendee_session
    ON bookings (attendee_user_id, session_id) WHERE cancelled_at IS NULL AND attendee_user_id IS NOT NULL;
  END IF;
END $$;

-- One active waitlist entry per attendee per session
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_waitlist_unique_active_attendee_session') THEN
    CREATE UNIQUE INDEX idx_waitlist_unique_active_attendee_session
    ON waitlist (attendee_user_id, session_id) WHERE status IN ('waiting', 'offered') AND attendee_user_id IS NOT NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_attendee_user_id ON bookings (attendee_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_session_active ON bookings (session_id) WHERE cancelled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_attendee_user_id ON waitlist (attendee_user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_session_active ON waitlist (session_id) WHERE status IN ('waiting', 'offered');
CREATE INDEX IF NOT EXISTS idx_workshops_published ON workshops (is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_sessions_not_cancelled ON sessions (workshop_id) WHERE is_cancelled = false;
