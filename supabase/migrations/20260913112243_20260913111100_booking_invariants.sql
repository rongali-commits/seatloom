-- Audited booking operations. Session locks always precede booking/waitlist locks.
ALTER TABLE public.sessions ADD CONSTRAINT sessions_identity_unique UNIQUE(id,workshop_id);
ALTER TABLE public.bookings ADD CONSTRAINT booking_session_workshop_fk FOREIGN KEY(session_id,workshop_id) REFERENCES public.sessions(id,workshop_id);
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_session_workshop_fk FOREIGN KEY(session_id,workshop_id) REFERENCES public.sessions(id,workshop_id);
ALTER TABLE public.sessions ADD CONSTRAINT capacity_bounded CHECK(capacity <= 1000);
ALTER TABLE public.workshops ADD CONSTRAINT workshop_duration_positive CHECK(duration_minutes BETWEEN 1 AND 10080);
ALTER TABLE public.workshops ADD CONSTRAINT workshop_price_free CHECK(price = 0);
DROP POLICY IF EXISTS update_own_sessions ON public.sessions;
DROP POLICY IF EXISTS delete_own_sessions ON public.sessions;
DROP POLICY IF EXISTS delete_own_workshops ON public.workshops;
DROP POLICY IF EXISTS delete_own_studios ON public.studios;

CREATE OR REPLACE FUNCTION public._is_session_owner(p_session_id uuid,p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.sessions s JOIN public.workshops w ON w.id=s.workshop_id JOIN public.studios st ON st.id=w.studio_id WHERE s.id=p_session_id AND st.owner_id=p_user_id);
$$;
GRANT EXECUTE ON FUNCTION public._is_session_owner(uuid,uuid) TO authenticated;

CREATE FUNCTION public._verified_user() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid:=auth.uid();
BEGIN
 IF v_id IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=v_id AND u.email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Sign in with a verified email to continue.'; END IF;
 RETURN v_id;
END; $$;
CREATE FUNCTION public._booking_event(p_studio uuid,p_user uuid,p_kind text,p_message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.activity(studio_id,type,message) VALUES(p_studio,p_kind,p_message);
 INSERT INTO public.email_outbox(studio_id,to_email,subject,body,sent)
 SELECT p_studio,u.email,'Seatloom booking update',p_message,false FROM auth.users u WHERE u.id=p_user AND u.email IS NOT NULL;
END; $$;
CREATE FUNCTION public._reconcile_queue(p_session uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_s public.sessions%ROWTYPE; v_w public.waitlist%ROWTYPE; v_studio uuid;
BEGIN
 SELECT * INTO v_s FROM public.sessions s WHERE s.id=p_session FOR UPDATE;
 IF NOT FOUND OR v_s.is_cancelled OR v_s.start_at<=now() THEN RETURN; END IF;
 SELECT w.studio_id INTO v_studio FROM public.workshops w WHERE w.id=v_s.workshop_id;
 UPDATE public.waitlist w SET status='expired' WHERE w.session_id=p_session AND w.status='offered' AND w.expires_at<=now();
 WHILE public._effective_holds(p_session)<v_s.capacity LOOP
  SELECT * INTO v_w FROM public.waitlist w WHERE w.session_id=p_session AND w.status='waiting' ORDER BY w.created_at,w.id LIMIT 1 FOR UPDATE;
  EXIT WHEN NOT FOUND;
  UPDATE public.waitlist w SET status='offered',offered_at=now(),expires_at=now()+interval '15 minutes' WHERE w.id=v_w.id;
  PERFORM public._booking_event(v_studio,v_w.attendee_user_id,'waitlist_offer','A seat is held for you for 15 minutes. Open My bookings to accept.');
 END LOOP;
END; $$;
CREATE OR REPLACE FUNCTION public._promote_next_waiter(p_session_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT public._reconcile_queue(p_session_id); $$;

CREATE FUNCTION public._new_booking(p_session uuid,p_user uuid) RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_b public.bookings%ROWTYPE; v_s public.sessions%ROWTYPE; v_studio uuid;
BEGIN
 SELECT * INTO v_s FROM public.sessions s WHERE s.id=p_session;
 INSERT INTO public.bookings(session_id,workshop_id,attendee_user_id,attendee_name,attendee_email,check_in_token,status,check_in)
 SELECT p_session,v_s.workshop_id,p_user,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)),u.email,replace(gen_random_uuid()::text,'-',''),'confirmed','registered' FROM auth.users u WHERE u.id=p_user
 RETURNING * INTO v_b;
 SELECT w.studio_id INTO v_studio FROM public.workshops w WHERE w.id=v_s.workshop_id;
 PERFORM public._booking_event(v_studio,p_user,'booking','Your seat is confirmed. Your ticket is available in My bookings.');
 RETURN v_b;
END; $$;

CREATE OR REPLACE FUNCTION public.reserve_seat(p_session_id uuid)
RETURNS TABLE(id uuid,workshop_id uuid,session_id uuid,check_in_token text,status text,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=public._verified_user(); v_s public.sessions%ROWTYPE; v_b public.bookings%ROWTYPE;
BEGIN
 SELECT * INTO v_s FROM public.sessions s WHERE s.id=p_session_id FOR UPDATE;
 IF NOT FOUND OR v_s.is_cancelled OR v_s.start_at<=now() OR NOT EXISTS(SELECT 1 FROM public.workshops w WHERE w.id=v_s.workshop_id AND w.is_published) THEN RAISE EXCEPTION 'This session is not available.'; END IF;
 SELECT * INTO v_b FROM public.bookings b WHERE b.session_id=p_session_id AND b.attendee_user_id=v_user AND b.cancelled_at IS NULL;
 IF FOUND THEN RETURN QUERY SELECT v_b.id,v_b.workshop_id,v_b.session_id,v_b.check_in_token,v_b.status,v_b.created_at; RETURN; END IF;
 PERFORM public._reconcile_queue(p_session_id);
 IF EXISTS(SELECT 1 FROM public.waitlist w WHERE w.session_id=p_session_id AND w.attendee_user_id=v_user AND w.status IN('waiting','offered')) THEN RAISE EXCEPTION 'You are already on this waitlist. Open My bookings.'; END IF;
 IF public._effective_holds(p_session_id)>=v_s.capacity THEN RAISE EXCEPTION 'This session is full. Join the waitlist.'; END IF;
 v_b:=public._new_booking(p_session_id,v_user);
 RETURN QUERY SELECT v_b.id,v_b.workshop_id,v_b.session_id,v_b.check_in_token,v_b.status,v_b.created_at;
END; $$;

CREATE OR REPLACE FUNCTION public.join_waitlist_rpc(p_session_id uuid)
RETURNS TABLE(id uuid,session_id uuid,status text,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=public._verified_user(); v_s public.sessions%ROWTYPE; v_w public.waitlist%ROWTYPE;
BEGIN
 SELECT * INTO v_s FROM public.sessions s WHERE s.id=p_session_id FOR UPDATE;
 IF NOT FOUND OR v_s.is_cancelled OR v_s.start_at<=now() OR NOT EXISTS(SELECT 1 FROM public.workshops w WHERE w.id=v_s.workshop_id AND w.is_published) THEN RAISE EXCEPTION 'This session is not available.'; END IF;
 PERFORM public._reconcile_queue(p_session_id);
 IF EXISTS(SELECT 1 FROM public.bookings b WHERE b.session_id=p_session_id AND b.attendee_user_id=v_user AND b.cancelled_at IS NULL) THEN RAISE EXCEPTION 'You already have a booking.'; END IF;
 SELECT * INTO v_w FROM public.waitlist w WHERE w.session_id=p_session_id AND w.attendee_user_id=v_user AND w.status IN('waiting','offered');
 IF FOUND THEN RETURN QUERY SELECT v_w.id,v_w.session_id,v_w.status,v_w.created_at; RETURN; END IF;
 IF public._effective_holds(p_session_id)<v_s.capacity THEN RAISE EXCEPTION 'A seat is available. Book directly.'; END IF;
 INSERT INTO public.waitlist(session_id,workshop_id,attendee_user_id,attendee_name,attendee_email,status)
 SELECT p_session_id,v_s.workshop_id,v_user,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)),u.email,'waiting' FROM auth.users u WHERE u.id=v_user RETURNING * INTO v_w;
 RETURN QUERY SELECT v_w.id,v_w.session_id,v_w.status,v_w.created_at;
END; $$;

CREATE OR REPLACE FUNCTION public.accept_offer_rpc(p_waitlist_id uuid)
RETURNS TABLE(id uuid,workshop_id uuid,session_id uuid,check_in_token text,status text,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=public._verified_user(); v_w public.waitlist%ROWTYPE; v_s public.sessions%ROWTYPE; v_b public.bookings%ROWTYPE;
BEGIN
 SELECT * INTO v_w FROM public.waitlist w WHERE w.id=p_waitlist_id AND w.attendee_user_id=v_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found.'; END IF;
 SELECT * INTO v_s FROM public.sessions s WHERE s.id=v_w.session_id FOR UPDATE;
 SELECT * INTO v_w FROM public.waitlist w WHERE w.id=p_waitlist_id FOR UPDATE;
 IF v_s.is_cancelled OR v_s.start_at<=now() OR NOT EXISTS(SELECT 1 FROM public.workshops w WHERE w.id=v_s.workshop_id AND w.is_published) THEN RAISE EXCEPTION 'This session is not available.'; END IF;
 IF v_w.status<>'offered' OR v_w.expires_at IS NULL OR v_w.expires_at<=now() THEN RAISE EXCEPTION 'Offer expired or no longer active. Refresh your waitlist.'; END IF;
 IF public._effective_holds(v_s.id)>v_s.capacity THEN RAISE EXCEPTION 'No reserved seat is available.'; END IF;
 v_b:=public._new_booking(v_s.id,v_user);
 UPDATE public.waitlist w SET status='booked' WHERE w.id=p_waitlist_id;
 RETURN QUERY SELECT v_b.id,v_b.workshop_id,v_b.session_id,v_b.check_in_token,v_b.status,v_b.created_at;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_booking_rpc(p_booking_id uuid) RETURNS TABLE(status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=public._verified_user(); v_b public.bookings%ROWTYPE; v_session uuid; v_studio uuid;
BEGIN
 SELECT * INTO v_b FROM public.bookings b WHERE b.id=p_booking_id;
 IF NOT FOUND OR (v_b.attendee_user_id IS DISTINCT FROM v_user AND NOT public._is_booking_owner(p_booking_id,v_user)) THEN RAISE EXCEPTION 'Booking not found or not yours.'; END IF;
 v_session:=v_b.session_id;
 PERFORM 1 FROM public.sessions s WHERE s.id=v_session FOR UPDATE;
 SELECT * INTO v_b FROM public.bookings b WHERE b.id=p_booking_id FOR UPDATE;
 IF v_b.session_id<>v_session THEN RAISE EXCEPTION 'Booking changed. Refresh and try again.'; END IF;
 IF v_b.cancelled_at IS NOT NULL THEN RETURN QUERY SELECT 'already_cancelled'::text; RETURN; END IF;
 UPDATE public.bookings b SET status='cancelled',cancelled_at=now() WHERE b.id=p_booking_id;
 SELECT w.studio_id INTO v_studio FROM public.workshops w WHERE w.id=v_b.workshop_id;
 PERFORM public._booking_event(v_studio,v_b.attendee_user_id,'cancellation','Your booking was cancelled.');
 PERFORM public._reconcile_queue(v_session);
 RETURN QUERY SELECT 'cancelled'::text;
END; $$;

CREATE OR REPLACE FUNCTION public.reschedule_booking_rpc(p_booking_id uuid,p_new_session_id uuid) RETURNS TABLE(id uuid,session_id uuid,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=public._verified_user(); v_b public.bookings%ROWTYPE; v_target public.sessions%ROWTYPE; v_old uuid; v_studio uuid;
BEGIN
 SELECT * INTO v_b FROM public.bookings b WHERE b.id=p_booking_id;
 IF NOT FOUND OR (v_b.attendee_user_id IS DISTINCT FROM v_user AND NOT public._is_booking_owner(p_booking_id,v_user)) THEN RAISE EXCEPTION 'Booking not found or not yours.'; END IF;
 v_old:=v_b.session_id;
 PERFORM 1 FROM public.sessions s WHERE s.id IN(v_old,p_new_session_id) ORDER BY s.id FOR UPDATE;
 SELECT * INTO v_b FROM public.bookings b WHERE b.id=p_booking_id FOR UPDATE;
 IF v_b.session_id<>v_old THEN RAISE EXCEPTION 'Booking changed. Refresh and try again.'; END IF;
 IF v_b.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Cannot reschedule a cancelled booking.'; END IF;
 IF v_old=p_new_session_id THEN RETURN QUERY SELECT v_b.id,v_old,v_b.status; RETURN; END IF;
 SELECT * INTO v_target FROM public.sessions s WHERE s.id=p_new_session_id;
 IF NOT FOUND OR v_target.workshop_id<>v_b.workshop_id OR v_target.is_cancelled OR v_target.start_at<=now() THEN RAISE EXCEPTION 'Choose an available session of the same workshop.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workshops w WHERE w.id=v_b.workshop_id AND w.is_published) THEN RAISE EXCEPTION 'Workshop is not published.'; END IF;
 IF EXISTS(SELECT 1 FROM public.sessions s WHERE s.id=v_old AND s.start_at<=now()) THEN RAISE EXCEPTION 'Past bookings cannot be rescheduled.'; END IF;
 PERFORM public._reconcile_queue(p_new_session_id);
 IF public._effective_holds(p_new_session_id)>=v_target.capacity THEN RAISE EXCEPTION 'Target session is full. Original booking retained.'; END IF;
 IF EXISTS(SELECT 1 FROM public.waitlist w WHERE w.session_id=p_new_session_id AND w.attendee_user_id=v_b.attendee_user_id AND w.status IN('waiting','offered')) THEN RAISE EXCEPTION 'Leave the target waitlist before rescheduling.'; END IF;
 UPDATE public.bookings b SET session_id=p_new_session_id,status='confirmed',check_in='registered' WHERE b.id=p_booking_id;
 PERFORM public._reconcile_queue(v_old);
 SELECT w.studio_id INTO v_studio FROM public.workshops w WHERE w.id=v_b.workshop_id;
 PERFORM public._booking_event(v_studio,v_b.attendee_user_id,'reschedule','Your booking was rescheduled. See My bookings for the new time.');
 RETURN QUERY SELECT p_booking_id,p_new_session_id,'confirmed'::text;
END; $$;

CREATE OR REPLACE FUNCTION public.update_session_capacity_rpc(p_session_id uuid,p_capacity integer) RETURNS TABLE(capacity integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=public._verified_user();
BEGIN
 PERFORM 1 FROM public.sessions s WHERE s.id=p_session_id FOR UPDATE;
 IF NOT public._is_session_owner(p_session_id,v_user) THEN RAISE EXCEPTION 'Only the organizer can change capacity.'; END IF;
 IF p_capacity IS NULL OR p_capacity NOT BETWEEN 1 AND 1000 OR p_capacity<public._effective_holds(p_session_id) THEN RAISE EXCEPTION 'Capacity must cover all bookings and live offers, between 1 and 1000.'; END IF;
 UPDATE public.sessions s SET capacity=p_capacity WHERE s.id=p_session_id;
 PERFORM public._reconcile_queue(p_session_id);
 RETURN QUERY SELECT p_capacity;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_session_rpc(p_session_id uuid) RETURNS TABLE(status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=public._verified_user(); v_s public.sessions%ROWTYPE; v_studio uuid; v_b public.bookings%ROWTYPE;
BEGIN
 SELECT * INTO v_s FROM public.sessions s WHERE s.id=p_session_id FOR UPDATE;
 IF NOT FOUND OR NOT public._is_session_owner(p_session_id,v_user) THEN RAISE EXCEPTION 'Only the organizer can cancel this session.'; END IF;
 IF v_s.is_cancelled THEN RETURN QUERY SELECT 'already_cancelled'::text; RETURN; END IF;
 SELECT w.studio_id INTO v_studio FROM public.workshops w WHERE w.id=v_s.workshop_id;
 UPDATE public.sessions s SET is_cancelled=true WHERE s.id=p_session_id;
 FOR v_b IN SELECT * FROM public.bookings b WHERE b.session_id=p_session_id AND b.cancelled_at IS NULL LOOP
  PERFORM public._booking_event(v_studio,v_b.attendee_user_id,'cancellation','The organizer cancelled your session.');
 END LOOP;
 UPDATE public.bookings b SET status='cancelled',cancelled_at=now() WHERE b.session_id=p_session_id AND b.cancelled_at IS NULL;
 UPDATE public.waitlist w SET status='expired' WHERE w.session_id=p_session_id AND w.status IN('waiting','offered');
 RETURN QUERY SELECT 'cancelled'::text;
END; $$;

CREATE FUNCTION public.refresh_waitlist_rpc(p_session_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=public._verified_user();
BEGIN
 IF NOT public._is_session_owner(p_session_id,v_user) AND NOT EXISTS(SELECT 1 FROM public.waitlist w WHERE w.session_id=p_session_id AND w.attendee_user_id=v_user) THEN RAISE EXCEPTION 'Waitlist not found.'; END IF;
 PERFORM public._reconcile_queue(p_session_id);
END; $$;
CREATE FUNCTION public.leave_waitlist_rpc(p_waitlist_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=public._verified_user(); v_w public.waitlist%ROWTYPE;
BEGIN
 SELECT * INTO v_w FROM public.waitlist w WHERE w.id=p_waitlist_id AND w.attendee_user_id=v_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Waitlist entry not found.'; END IF;
 PERFORM 1 FROM public.sessions s WHERE s.id=v_w.session_id FOR UPDATE;
 UPDATE public.waitlist w SET status='expired' WHERE w.id=p_waitlist_id AND w.status IN('waiting','offered');
 PERFORM public._reconcile_queue(v_w.session_id);
END; $$;

CREATE OR REPLACE FUNCTION public.get_public_workshop_sessions(p_workshop_id uuid)
RETURNS TABLE(id uuid,format text,start_at timestamptz,end_at timestamptz,capacity integer,location text,timezone text,available_seats integer,is_full boolean)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT s.id,s.format,s.start_at,s.end_at,s.capacity,s.location,s.timezone,
 greatest(0,s.capacity-public._effective_holds(s.id)-(SELECT count(*)::integer FROM public.waitlist q WHERE q.session_id=s.id AND q.status='waiting')),
 public._effective_holds(s.id)+(SELECT count(*) FROM public.waitlist q WHERE q.session_id=s.id AND q.status='waiting')>=s.capacity
 FROM public.sessions s JOIN public.workshops w ON w.id=s.workshop_id WHERE w.id=p_workshop_id AND w.is_published AND NOT s.is_cancelled AND s.start_at>now() ORDER BY s.start_at;
$$;

REVOKE EXECUTE ON FUNCTION public._verified_user(),public._booking_event(uuid,uuid,text,text),public._reconcile_queue(uuid),public._new_booking(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_waitlist_rpc(uuid),public.leave_waitlist_rpc(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.refresh_waitlist_rpc(uuid),public.leave_waitlist_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_studio(text),public.get_public_workshop(text,text),public.get_public_workshop_sessions(uuid),public.get_public_studio_workshops(text) TO anon,authenticated;
