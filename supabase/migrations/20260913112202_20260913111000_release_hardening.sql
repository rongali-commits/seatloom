-- Release audit: resolve output-variable ambiguity, safe search paths and count types.
CREATE OR REPLACE FUNCTION public._effective_holds(p_session_id uuid)
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    (SELECT count(*)::integer FROM public.bookings WHERE session_id = p_session_id AND cancelled_at IS NULL)
    +
    (SELECT count(*)::integer FROM public.waitlist WHERE session_id = p_session_id AND status = 'offered' AND expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public._promote_next_waiter(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_waitlist_id uuid;
BEGIN
  SELECT id INTO v_waitlist_id FROM public.waitlist
  WHERE session_id = p_session_id AND status = 'waiting'
  ORDER BY created_at ASC LIMIT 1 FOR UPDATE;
  IF v_waitlist_id IS NOT NULL THEN
    UPDATE public.waitlist SET status = 'offered', offered_at = now(), expires_at = now() + interval '15 minutes'
    WHERE id = v_waitlist_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._expire_stale_offers(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  UPDATE public.waitlist SET status = 'expired'
  WHERE session_id = p_session_id AND status = 'offered' AND expires_at <= now();
END;
$$;

CREATE OR REPLACE FUNCTION public._is_session_owner(p_session_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.workshops w ON w.id = s.workshop_id
    JOIN public.studios st ON st.id = w.studio_id
    WHERE s.id = p_session_id AND st.owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public._is_workshop_owner(p_workshop_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workshops w
    JOIN public.studios st ON st.id = w.studio_id
    WHERE w.id = p_workshop_id AND st.owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public._is_booking_owner(p_booking_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.sessions s ON s.id = b.session_id
    JOIN public.workshops w ON w.id = s.workshop_id
    JOIN public.studios st ON st.id = w.studio_id
    WHERE b.id = p_booking_id AND st.owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.reserve_seat(p_session_id uuid)
RETURNS TABLE (id uuid, workshop_id uuid, session_id uuid, check_in_token text, status text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.sessions%ROWTYPE;
  v_workshop public.workshops%ROWTYPE;
  v_studio public.studios%ROWTYPE;
  v_holds integer;
  v_token text;
  v_booking_id uuid;
  v_existing uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be signed in to book a session.'; END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found.'; END IF;
  SELECT * INTO v_workshop FROM public.workshops WHERE id = v_session.workshop_id;
  SELECT * INTO v_studio FROM public.studios WHERE id = v_workshop.studio_id;
  IF v_session.is_cancelled THEN RAISE EXCEPTION 'This session has been cancelled.'; END IF;
  IF NOT v_workshop.is_published THEN RAISE EXCEPTION 'This workshop is not available for booking.'; END IF;
  IF v_session.start_at <= now() THEN RAISE EXCEPTION 'This session has already started or is in the past.'; END IF;
  PERFORM public._expire_stale_offers(p_session_id);
  SELECT id INTO v_existing FROM public.bookings WHERE session_id = p_session_id AND attendee_user_id = v_user_id AND cancelled_at IS NULL;
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'You already have an active booking for this session.'; END IF;
  SELECT id INTO v_existing FROM public.waitlist WHERE session_id = p_session_id AND attendee_user_id = v_user_id AND status IN ('waiting', 'offered');
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'You are already on the waitlist for this session.'; END IF;
  v_holds := public._effective_holds(p_session_id);
  IF v_holds >= v_session.capacity THEN RAISE EXCEPTION 'This session is full. Please join the waitlist.'; END IF;
  v_token := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.bookings (session_id, workshop_id, attendee_user_id, check_in_token, status, check_in)
  VALUES (p_session_id, v_session.workshop_id, v_user_id, v_token, 'confirmed', 'registered')
  RETURNING id INTO v_booking_id;
  INSERT INTO public.activity (studio_id, type, message) VALUES (v_studio.id, 'booking', 'New booking confirmed');
  INSERT INTO public.email_outbox (studio_id, to_email, subject, body, sent)
  SELECT v_studio.id, u.email, 'Booking confirmed',
    'Your booking for ' || v_workshop.title || ' has been confirmed. Check-in token: ' || v_token, false
  FROM auth.users u WHERE u.id = v_user_id;
  RETURN QUERY SELECT v_booking_id, v_session.workshop_id, p_session_id, v_token, 'confirmed'::text, now();
END;
$$;

CREATE OR REPLACE FUNCTION public.join_waitlist_rpc(p_session_id uuid)
RETURNS TABLE (id uuid, session_id uuid, status text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.sessions%ROWTYPE;
  v_workshop public.workshops%ROWTYPE;
  v_studio public.studios%ROWTYPE;
  v_holds integer;
  v_existing uuid;
  v_waitlist_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be signed in to join a waitlist.'; END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found.'; END IF;
  SELECT * INTO v_workshop FROM public.workshops WHERE id = v_session.workshop_id;
  SELECT * INTO v_studio FROM public.studios WHERE id = v_workshop.studio_id;
  IF v_session.is_cancelled THEN RAISE EXCEPTION 'This session has been cancelled.'; END IF;
  IF NOT v_workshop.is_published THEN RAISE EXCEPTION 'This workshop is not available.'; END IF;
  IF v_session.start_at <= now() THEN RAISE EXCEPTION 'This session has already started.'; END IF;
  PERFORM public._expire_stale_offers(p_session_id);
  SELECT id INTO v_existing FROM public.bookings WHERE session_id = p_session_id AND attendee_user_id = v_user_id AND cancelled_at IS NULL;
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'You already have an active booking for this session.'; END IF;
  SELECT id INTO v_existing FROM public.waitlist WHERE session_id = p_session_id AND attendee_user_id = v_user_id AND status IN ('waiting', 'offered');
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'You are already on the waitlist for this session.'; END IF;
  v_holds := public._effective_holds(p_session_id);
  IF v_holds < v_session.capacity THEN RAISE EXCEPTION 'Seats are still available. Please book directly.'; END IF;
  INSERT INTO public.waitlist (session_id, workshop_id, attendee_user_id, status)
  VALUES (p_session_id, v_session.workshop_id, v_user_id, 'waiting')
  RETURNING id INTO v_waitlist_id;
  INSERT INTO public.activity (studio_id, type, message) VALUES (v_studio.id, 'waitlist_join', 'New waitlist entry');
  RETURN QUERY SELECT v_waitlist_id, p_session_id, 'waiting'::text, now();
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_offer_rpc(p_waitlist_id uuid)
RETURNS TABLE (id uuid, workshop_id uuid, session_id uuid, check_in_token text, status text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_entry public.waitlist%ROWTYPE;
  v_session public.sessions%ROWTYPE;
  v_workshop public.workshops%ROWTYPE;
  v_studio public.studios%ROWTYPE;
  v_holds integer;
  v_token text;
  v_booking_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be signed in to accept an offer.'; END IF;
  SELECT * INTO v_entry FROM public.waitlist WHERE id = p_waitlist_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Waitlist entry not found.'; END IF;
  IF v_entry.attendee_user_id != v_user_id THEN RAISE EXCEPTION 'This offer does not belong to you.'; END IF;
  IF v_entry.status != 'offered' THEN RAISE EXCEPTION 'This offer is no longer active.'; END IF;
  IF v_entry.expires_at <= now() THEN
    UPDATE public.waitlist SET status = 'expired' WHERE id = p_waitlist_id;
    PERFORM public._promote_next_waiter(v_entry.session_id);
    RAISE EXCEPTION 'This offer has expired.';
  END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = v_entry.session_id FOR UPDATE;
  SELECT * INTO v_workshop FROM public.workshops WHERE id = v_session.workshop_id;
  SELECT * INTO v_studio FROM public.studios WHERE id = v_workshop.studio_id;
  IF v_session.is_cancelled THEN RAISE EXCEPTION 'This session has been cancelled.'; END IF;
  IF v_session.start_at <= now() THEN RAISE EXCEPTION 'This session has already started.'; END IF;
  v_holds := public._effective_holds(v_entry.session_id);
  IF v_holds - 1 >= v_session.capacity THEN
    UPDATE public.waitlist SET status = 'expired' WHERE id = p_waitlist_id;
    PERFORM public._promote_next_waiter(v_entry.session_id);
    RAISE EXCEPTION 'Session is full. The offer could not be completed.';
  END IF;
  v_token := replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.bookings (session_id, workshop_id, attendee_user_id, check_in_token, status, check_in)
  VALUES (v_entry.session_id, v_entry.workshop_id, v_user_id, v_token, 'confirmed', 'registered')
  RETURNING id INTO v_booking_id;
  UPDATE public.waitlist SET status = 'booked' WHERE id = p_waitlist_id;
  INSERT INTO public.activity (studio_id, type, message) VALUES (v_studio.id, 'waitlist_booked', 'Waitlist offer accepted');
  INSERT INTO public.email_outbox (studio_id, to_email, subject, body, sent)
  SELECT v_studio.id, u.email, 'Booking confirmed from waitlist',
    'Your waitlist offer for ' || v_workshop.title || ' has been accepted. Check-in token: ' || v_token, false
  FROM auth.users u WHERE u.id = v_user_id;
  RETURN QUERY SELECT v_booking_id, v_entry.workshop_id, v_entry.session_id, v_token, 'confirmed'::text, now();
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking_rpc(p_booking_id uuid)
RETURNS TABLE (status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_session public.sessions%ROWTYPE;
  v_workshop public.workshops%ROWTYPE;
  v_studio public.studios%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be signed in to cancel a booking.'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.'; END IF;
  IF v_booking.attendee_user_id != v_user_id AND NOT public._is_booking_owner(p_booking_id, v_user_id) THEN
    RAISE EXCEPTION 'You can only cancel your own booking.';
  END IF;
  IF v_booking.cancelled_at IS NOT NULL THEN
    RETURN QUERY SELECT 'already_cancelled'::text; RETURN;
  END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = v_booking.session_id FOR UPDATE;
  SELECT * INTO v_workshop FROM public.workshops WHERE id = v_session.workshop_id;
  SELECT * INTO v_studio FROM public.studios WHERE id = v_workshop.studio_id;
  UPDATE public.bookings SET cancelled_at = now(), status = 'cancelled' WHERE id = p_booking_id;
  PERFORM public._expire_stale_offers(v_booking.session_id);
  PERFORM public._promote_next_waiter(v_booking.session_id);
  INSERT INTO public.activity (studio_id, type, message) VALUES (v_studio.id, 'cancellation', 'Booking cancelled');
  RETURN QUERY SELECT 'cancelled'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.reschedule_booking_rpc(p_booking_id uuid, p_new_session_id uuid)
RETURNS TABLE (id uuid, session_id uuid, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_new_session public.sessions%ROWTYPE;
  v_workshop public.workshops%ROWTYPE;
  v_studio public.studios%ROWTYPE;
  v_holds integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be signed in to reschedule.'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.'; END IF;
  IF v_booking.attendee_user_id != v_user_id AND NOT public._is_booking_owner(p_booking_id, v_user_id) THEN
    RAISE EXCEPTION 'You can only reschedule your own booking.';
  END IF;
  IF v_booking.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Cannot reschedule a cancelled booking.'; END IF;
  SELECT * INTO v_new_session FROM public.sessions WHERE id = p_new_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target session not found.'; END IF;
  IF v_new_session.is_cancelled THEN RAISE EXCEPTION 'Target session has been cancelled.'; END IF;
  IF v_new_session.start_at <= now() THEN RAISE EXCEPTION 'Target session has already started.'; END IF;
  SELECT * INTO v_workshop FROM public.workshops WHERE id = v_new_session.workshop_id;
  IF NOT v_workshop.is_published THEN RAISE EXCEPTION 'Target workshop is not published.'; END IF;
  IF v_booking.session_id < p_new_session_id THEN
    PERFORM 1 FROM public.sessions WHERE id = v_booking.session_id FOR UPDATE;
    PERFORM 1 FROM public.sessions WHERE id = p_new_session_id FOR UPDATE;
  ELSE
    PERFORM 1 FROM public.sessions WHERE id = p_new_session_id FOR UPDATE;
    PERFORM 1 FROM public.sessions WHERE id = v_booking.session_id FOR UPDATE;
  END IF;
  PERFORM public._expire_stale_offers(v_booking.session_id);
  PERFORM public._expire_stale_offers(p_new_session_id);
  v_holds := public._effective_holds(p_new_session_id);
  IF v_holds >= v_new_session.capacity THEN
    RAISE EXCEPTION 'Target session is full. Your original booking is retained.';
  END IF;
  SELECT * INTO v_studio FROM public.studios WHERE id = v_workshop.studio_id;
  UPDATE public.bookings SET session_id = p_new_session_id, status = 'rescheduled' WHERE id = p_booking_id;
  PERFORM public._promote_next_waiter(v_booking.session_id);
  INSERT INTO public.activity (studio_id, type, message) VALUES (v_studio.id, 'reschedule', 'Booking rescheduled');
  RETURN QUERY SELECT p_booking_id, p_new_session_id, 'rescheduled'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_in_rpc(p_booking_id uuid, p_status text)
RETURNS TABLE (status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_studio public.studios%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be signed in to check in attendees.'; END IF;
  IF p_status NOT IN ('attended', 'no-show', 'registered') THEN RAISE EXCEPTION 'Invalid check-in status.'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found.'; END IF;
  IF NOT public._is_booking_owner(p_booking_id, v_user_id) THEN RAISE EXCEPTION 'Only the studio organizer can check in attendees.'; END IF;
  IF v_booking.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Cannot check in a cancelled booking.'; END IF;
  SELECT st.* INTO v_studio FROM public.studios st
  JOIN public.workshops w ON w.studio_id = st.id
  JOIN public.sessions s ON s.workshop_id = w.id WHERE s.id = v_booking.session_id;
  UPDATE public.bookings SET check_in = p_status WHERE id = p_booking_id;
  INSERT INTO public.activity (studio_id, type, message) VALUES (v_studio.id, 'check_in', 'Check-in updated to: ' || p_status);
  RETURN QUERY SELECT p_status::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_session_capacity_rpc(p_session_id uuid, p_capacity integer)
RETURNS TABLE (capacity integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.sessions%ROWTYPE;
  v_holds integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF p_capacity < 1 THEN RAISE EXCEPTION 'Capacity must be at least 1.'; END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found.'; END IF;
  IF NOT public._is_session_owner(p_session_id, v_user_id) THEN RAISE EXCEPTION 'Only the studio organizer can update capacity.'; END IF;
  PERFORM public._expire_stale_offers(p_session_id);
  v_holds := public._effective_holds(p_session_id);
  IF p_capacity < v_holds THEN RAISE EXCEPTION 'Cannot reduce capacity below current reservations and holds (%).', v_holds; END IF;
  UPDATE public.sessions SET capacity = p_capacity WHERE id = p_session_id;
  RETURN QUERY SELECT p_capacity;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_session_rpc(p_session_id uuid)
RETURNS TABLE (status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.sessions%ROWTYPE;
  v_studio public.studios%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found.'; END IF;
  IF NOT public._is_session_owner(p_session_id, v_user_id) THEN RAISE EXCEPTION 'Only the studio organizer can cancel sessions.'; END IF;
  SELECT st.* INTO v_studio FROM public.studios st JOIN public.workshops w ON w.studio_id = st.id WHERE w.id = v_session.workshop_id;
  UPDATE public.sessions SET is_cancelled = true WHERE id = p_session_id;
  INSERT INTO public.activity (studio_id, type, message) VALUES (v_studio.id, 'cancellation', 'Session cancelled');
  RETURN QUERY SELECT 'cancelled'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_studio(p_studio_slug text)
RETURNS TABLE (id uuid, name text, slug text, bio text, instructor_name text, instructor_bio text, instructor_photo_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_studio public.studios%ROWTYPE;
BEGIN
  SELECT * INTO v_studio FROM public.studios WHERE slug = p_studio_slug;
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY SELECT v_studio.id, v_studio.name, v_studio.slug, v_studio.bio,
    v_studio.instructor_name, v_studio.instructor_bio, v_studio.instructor_photo_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_workshop(p_studio_slug text, p_workshop_slug text)
RETURNS TABLE (
  id uuid, studio_id uuid, title text, slug text, category text,
  short_description text, long_description text, learning_outcomes text[],
  materials text[], prerequisites text, accessibility text,
  cancellation_policy text, duration_minutes integer, price integer,
  cover_image text, gallery text[], formats text[],
  instructor_name text, instructor_bio text, instructor_photo_url text,
  studio_name text, studio_slug text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_workshop public.workshops%ROWTYPE; v_studio public.studios%ROWTYPE;
BEGIN
  SELECT * INTO v_studio FROM public.studios WHERE slug = p_studio_slug;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO v_workshop FROM public.workshops WHERE studio_id = v_studio.id AND slug = p_workshop_slug AND is_published = true;
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY SELECT v_workshop.id, v_workshop.studio_id, v_workshop.title, v_workshop.slug,
    v_workshop.category, v_workshop.short_description, v_workshop.long_description,
    v_workshop.learning_outcomes, v_workshop.materials, v_workshop.prerequisites,
    v_workshop.accessibility, v_workshop.cancellation_policy, v_workshop.duration_minutes,
    v_workshop.price, v_workshop.cover_image, v_workshop.gallery, v_workshop.formats,
    COALESCE(v_workshop.instructor_name, v_studio.instructor_name),
    COALESCE(v_workshop.instructor_bio, v_studio.instructor_bio),
    COALESCE(v_workshop.instructor_photo_url, v_studio.instructor_photo_url),
    v_studio.name, v_studio.slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_workshop_sessions(p_workshop_id uuid)
RETURNS TABLE (id uuid, format text, start_at timestamptz, end_at timestamptz,
  capacity integer, location text, timezone text, available_seats integer, is_full boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT s.id, s.format, s.start_at, s.end_at, s.capacity, s.location, s.timezone,
    GREATEST(0, s.capacity - public._effective_holds(s.id)),
    (public._effective_holds(s.id) >= s.capacity)
  FROM public.sessions s
  WHERE s.workshop_id = p_workshop_id AND s.is_cancelled = false AND s.start_at > now()
  ORDER BY s.start_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_studio_workshops(p_studio_slug text)
RETURNS TABLE (
  id uuid, title text, slug text, category text, short_description text,
  duration_minutes integer, price integer, cover_image text,
  instructor_name text, next_session_at timestamptz, available_seats integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_studio_id uuid;
BEGIN
  SELECT id INTO v_studio_id FROM public.studios WHERE slug = p_studio_slug;
  IF v_studio_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT w.id, w.title, w.slug, w.category, w.short_description,
    w.duration_minutes, w.price, w.cover_image,
    COALESCE(w.instructor_name, (SELECT instructor_name FROM public.studios WHERE id = v_studio_id)),
    (SELECT min(s.start_at) FROM public.sessions s WHERE s.workshop_id = w.id AND s.is_cancelled = false AND s.start_at > now()),
    (SELECT GREATEST(0, min(s.capacity - public._effective_holds(s.id))) FROM public.sessions s WHERE s.workshop_id = w.id AND s.is_cancelled = false AND s.start_at > now())
  FROM public.workshops w
  WHERE w.studio_id = v_studio_id AND w.is_published = true
  ORDER BY 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_bookings()
RETURNS TABLE (
  id uuid, workshop_id uuid, session_id uuid, workshop_title text, workshop_slug text,
  studio_slug text, session_format text, session_start_at timestamptz, session_end_at timestamptz,
  session_location text, session_timezone text, session_is_cancelled boolean,
  booking_status text, check_in text, check_in_token text, created_at timestamptz, cancelled_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT b.id, b.workshop_id, b.session_id, w.title, w.slug, st.slug,
    s.format, s.start_at, s.end_at, s.location, s.timezone, s.is_cancelled,
    b.status, b.check_in, b.check_in_token, b.created_at, b.cancelled_at
  FROM public.bookings b
  JOIN public.sessions s ON s.id = b.session_id
  JOIN public.workshops w ON w.id = b.workshop_id
  JOIN public.studios st ON st.id = w.studio_id
  WHERE b.attendee_user_id = v_user_id
  ORDER BY s.start_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_waitlist()
RETURNS TABLE (
  id uuid, workshop_id uuid, session_id uuid, workshop_title text, workshop_slug text,
  studio_slug text, session_format text, session_start_at timestamptz,
  session_location text, status text, offered_at timestamptz, expires_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT wl.id, wl.workshop_id, wl.session_id, w.title, w.slug, st.slug,
    s.format, s.start_at, s.location,
    wl.status, wl.offered_at, wl.expires_at, wl.created_at
  FROM public.waitlist wl
  JOIN public.sessions s ON s.id = wl.session_id
  JOIN public.workshops w ON w.id = wl.workshop_id
  JOIN public.studios st ON st.id = w.studio_id
  WHERE wl.attendee_user_id = v_user_id AND wl.status IN ('waiting', 'offered')
  ORDER BY s.start_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_studio_dashboard()
RETURNS TABLE (studio_id uuid, studio_name text, studio_slug text, studio_bio text,
  instructor_name text, instructor_bio text, instructor_photo_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT id, name, slug, bio, instructor_name, instructor_bio, instructor_photo_url
  FROM public.studios WHERE owner_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_studio_workshops()
RETURNS TABLE (
  id uuid, title text, slug text, category text, short_description text,
  is_published boolean, duration_minutes integer, price integer, cover_image text,
  instructor_name text, session_count integer, next_session_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT w.id, w.title, w.slug, w.category, w.short_description,
    w.is_published, w.duration_minutes, w.price, w.cover_image,
    COALESCE(w.instructor_name, st.instructor_name),
    (SELECT count(*)::integer FROM public.sessions s WHERE s.workshop_id = w.id AND s.is_cancelled = false),
    (SELECT min(s.start_at) FROM public.sessions s WHERE s.workshop_id = w.id AND s.is_cancelled = false AND s.start_at > now())
  FROM public.workshops w JOIN public.studios st ON st.id = w.studio_id
  WHERE st.owner_id = v_user_id ORDER BY w.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_studio_sessions(p_workshop_id uuid)
RETURNS TABLE (
  id uuid, workshop_id uuid, format text, start_at timestamptz, end_at timestamptz,
  capacity integer, location text, timezone text, is_cancelled boolean,
  booked_count integer, waitlist_count integer, attended_count integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  IF NOT public._is_workshop_owner(p_workshop_id, v_user_id) THEN RETURN; END IF;
  RETURN QUERY
  SELECT s.id, s.workshop_id, s.format, s.start_at, s.end_at, s.capacity,
    s.location, s.timezone, s.is_cancelled,
    (SELECT count(*)::integer FROM public.bookings b WHERE b.session_id = s.id AND b.cancelled_at IS NULL),
    (SELECT count(*)::integer FROM public.waitlist wl WHERE wl.session_id = s.id AND wl.status IN ('waiting', 'offered')),
    (SELECT count(*)::integer FROM public.bookings b WHERE b.session_id = s.id AND b.cancelled_at IS NULL AND b.check_in = 'attended')
  FROM public.sessions s WHERE s.workshop_id = p_workshop_id ORDER BY s.start_at;
END;
$$;

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
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.email, b.status, b.check_in, b.check_in_token, b.created_at, b.cancelled_at
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
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.email, wl.status, wl.offered_at, wl.expires_at, wl.created_at
  FROM public.waitlist wl LEFT JOIN auth.users u ON u.id = wl.attendee_user_id
  WHERE wl.session_id = p_session_id AND wl.status IN ('waiting', 'offered')
  ORDER BY wl.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_studio_activity()
RETURNS TABLE (id uuid, type text, message text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT a.id, a.type, a.message, a.created_at
  FROM public.activity a JOIN public.studios st ON st.id = a.studio_id
  WHERE st.owner_id = v_user_id ORDER BY a.created_at DESC LIMIT 50;
END;
$$;
