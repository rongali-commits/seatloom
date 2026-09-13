-- Fix: auth.users.email is varchar, but get_studio_roster/get_studio_waitlist declare attendee_email as text.
-- Cast u.email::text to match the RETURNS TABLE signature. All other columns already match.
-- Authorization, search_path, and grants are preserved identically.

CREATE OR REPLACE FUNCTION public.get_studio_roster(p_session_id uuid)
RETURNS TABLE (id uuid, attendee_name text, attendee_email text, status text,
  check_in text, check_in_token text, created_at timestamptz, cancelled_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  IF NOT public._is_session_owner(p_session_id, v_user_id) THEN RETURN; END IF;
  RETURN QUERY
  SELECT b.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email::text, '@', 1)),
    u.email::text, b.status, b.check_in, b.check_in_token, b.created_at, b.cancelled_at
  FROM public.bookings b LEFT JOIN auth.users u ON u.id = b.attendee_user_id
  WHERE b.session_id = p_session_id ORDER BY b.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_studio_waitlist(p_session_id uuid)
RETURNS TABLE (id uuid, attendee_name text, attendee_email text, status text,
  offered_at timestamptz, expires_at timestamptz, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  IF NOT public._is_session_owner(p_session_id, v_user_id) THEN RETURN; END IF;
  RETURN QUERY
  SELECT wl.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email::text, '@', 1)),
    u.email::text, wl.status, wl.offered_at, wl.expires_at, wl.created_at
  FROM public.waitlist wl LEFT JOIN auth.users u ON u.id = wl.attendee_user_id
  WHERE wl.session_id = p_session_id AND wl.status IN ('waiting', 'offered')
  ORDER BY wl.created_at;
END;
$$;
