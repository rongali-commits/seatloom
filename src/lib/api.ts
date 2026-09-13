import { supabase } from "./supabase";

export interface PublicStudio {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  instructor_name: string | null;
  instructor_bio: string | null;
  instructor_photo_url: string | null;
}

export interface PublicWorkshop {
  id: string;
  studio_id: string;
  title: string;
  slug: string;
  category: string;
  short_description: string;
  long_description: string;
  learning_outcomes: string[];
  materials: string[];
  prerequisites: string | null;
  accessibility: string | null;
  cancellation_policy: string | null;
  duration_minutes: number;
  price: number;
  cover_image: string | null;
  gallery: string[];
  formats: string[];
  instructor_name: string | null;
  instructor_bio: string | null;
  instructor_photo_url: string | null;
  studio_name: string;
  studio_slug: string;
}

export interface PublicSession {
  id: string;
  format: string;
  start_at: string;
  end_at: string;
  capacity: number;
  location: string;
  timezone: string | null;
  available_seats: number;
  is_full: boolean;
}

export interface PublicStudioWorkshop {
  id: string;
  title: string;
  slug: string;
  category: string;
  short_description: string;
  duration_minutes: number;
  price: number;
  cover_image: string | null;
  instructor_name: string | null;
  next_session_at: string | null;
  available_seats: number | null;
}

export interface MyBooking {
  id: string;
  workshop_id: string;
  session_id: string;
  workshop_title: string;
  workshop_slug: string;
  studio_slug: string;
  session_format: string;
  session_start_at: string;
  session_end_at: string;
  session_location: string;
  session_timezone: string | null;
  session_is_cancelled: boolean;
  booking_status: string;
  check_in: string;
  check_in_token: string;
  created_at: string;
  cancelled_at: string | null;
}

export interface MyWaitlistEntry {
  id: string;
  workshop_id: string;
  session_id: string;
  workshop_title: string;
  workshop_slug: string;
  studio_slug: string;
  session_format: string;
  session_start_at: string;
  session_location: string;
  status: string;
  offered_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface StudioDashboard {
  studio_id: string;
  studio_name: string;
  studio_slug: string;
  studio_bio: string | null;
  instructor_name: string | null;
  instructor_bio: string | null;
  instructor_photo_url: string | null;
}

export interface StudioWorkshop {
  id: string;
  title: string;
  slug: string;
  category: string;
  short_description: string;
  is_published: boolean;
  duration_minutes: number;
  price: number;
  cover_image: string | null;
  instructor_name: string | null;
  session_count: number;
  next_session_at: string | null;
}

export interface StudioSession {
  id: string;
  workshop_id: string;
  format: string;
  start_at: string;
  end_at: string;
  capacity: number;
  location: string;
  timezone: string | null;
  is_cancelled: boolean;
  booked_count: number;
  waitlist_count: number;
  attended_count: number;
}

export interface RosterEntry {
  id: string;
  attendee_name: string;
  attendee_email: string;
  status: string;
  check_in: string;
  check_in_token: string;
  created_at: string;
  cancelled_at: string | null;
}

export interface WaitlistRosterEntry {
  id: string;
  attendee_name: string;
  attendee_email: string;
  status: string;
  offered_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  type: string;
  message: string;
  created_at: string;
}

export interface ReserveResult {
  id: string;
  workshop_id: string;
  session_id: string;
  check_in_token: string;
  status: string;
  created_at: string;
}

function extractError(
  err: { message?: string } | null,
  fallback: string,
): string {
  if (!err || !err.message) return fallback;
  return (
    err.message
      .replace(/^ERROR:\s*/i, "")
      .replace(/Context:[\s\S]*$/, "")
      .trim() || fallback
  );
}

export async function fetchPublicStudio(
  slug: string,
): Promise<PublicStudio | null> {
  const { data, error } = await supabase.rpc("get_public_studio", {
    p_studio_slug: slug,
  });
  if (error) throw new Error(extractError(error, "Could not load studio."));
  return data?.[0] ?? null;
}

export async function fetchPublicStudioWorkshops(
  slug: string,
): Promise<PublicStudioWorkshop[]> {
  const { data, error } = await supabase.rpc("get_public_studio_workshops", {
    p_studio_slug: slug,
  });
  if (error) throw new Error(extractError(error, "Could not load workshops."));
  return data ?? [];
}

export async function fetchPublicWorkshop(
  studioSlug: string,
  workshopSlug: string,
): Promise<PublicWorkshop | null> {
  const { data, error } = await supabase.rpc("get_public_workshop", {
    p_studio_slug: studioSlug,
    p_workshop_slug: workshopSlug,
  });
  if (error) throw new Error(extractError(error, "Could not load workshop."));
  return data?.[0] ?? null;
}

export async function fetchPublicWorkshopSessions(
  workshopId: string,
): Promise<PublicSession[]> {
  const { data, error } = await supabase.rpc("get_public_workshop_sessions", {
    p_workshop_id: workshopId,
  });
  if (error) throw new Error(extractError(error, "Could not load sessions."));
  return data ?? [];
}

export async function reserveSeat(sessionId: string): Promise<ReserveResult> {
  const { data, error } = await supabase.rpc("reserve_seat", {
    p_session_id: sessionId,
  });
  if (error)
    throw new Error(extractError(error, "Could not complete booking."));
  if (!data || data.length === 0) throw new Error("Booking failed.");
  return data[0];
}

export async function joinWaitlist(
  sessionId: string,
): Promise<{ id: string; status: string }> {
  const { data, error } = await supabase.rpc("join_waitlist_rpc", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(extractError(error, "Could not join waitlist."));
  if (!data || data.length === 0) throw new Error("Waitlist join failed.");
  return data[0];
}

export async function acceptOffer(waitlistId: string): Promise<ReserveResult> {
  const { data, error } = await supabase.rpc("accept_offer_rpc", {
    p_waitlist_id: waitlistId,
  });
  if (error) throw new Error(extractError(error, "Could not accept offer."));
  if (!data || data.length === 0) throw new Error("Accept failed.");
  return data[0];
}

export async function cancelBooking(
  bookingId: string,
): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("cancel_booking_rpc", {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(extractError(error, "Could not cancel booking."));
  if (!data || data.length === 0) throw new Error("Cancel failed.");
  return data[0];
}

export async function rescheduleBooking(
  bookingId: string,
  newSessionId: string,
): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("reschedule_booking_rpc", {
    p_booking_id: bookingId,
    p_new_session_id: newSessionId,
  });
  if (error) throw new Error(extractError(error, "Could not reschedule."));
  if (!data || data.length === 0) throw new Error("Reschedule failed.");
  return data[0];
}

export async function checkIn(
  bookingId: string,
  status: string,
): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("check_in_rpc", {
    p_booking_id: bookingId,
    p_status: status,
  });
  if (error) throw new Error(extractError(error, "Could not check in."));
  if (!data || data.length === 0) throw new Error("Check-in failed.");
  return data[0];
}

export async function updateSessionCapacity(
  sessionId: string,
  capacity: number,
): Promise<{ capacity: number }> {
  const { data, error } = await supabase.rpc("update_session_capacity_rpc", {
    p_session_id: sessionId,
    p_capacity: capacity,
  });
  if (error) throw new Error(extractError(error, "Could not update capacity."));
  if (!data || data.length === 0) throw new Error("Capacity update failed.");
  return data[0];
}

export async function cancelSession(
  sessionId: string,
): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("cancel_session_rpc", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(extractError(error, "Could not cancel session."));
  if (!data || data.length === 0) throw new Error("Session cancel failed.");
  return data[0];
}

export async function fetchMyBookings(): Promise<MyBooking[]> {
  const { data, error } = await supabase.rpc("get_my_bookings");
  if (error)
    throw new Error(extractError(error, "Could not load your bookings."));
  return data ?? [];
}

export async function fetchMyWaitlist(): Promise<MyWaitlistEntry[]> {
  const initial = await supabase.rpc("get_my_waitlist");
  if (initial.error)
    throw new Error(extractError(initial.error, "Could not load waitlist."));
  for (const sessionId of new Set(
    (initial.data || []).map((w: MyWaitlistEntry) => w.session_id),
  )) {
    const refreshed = await supabase.rpc("refresh_waitlist_rpc", {
      p_session_id: sessionId,
    });
    if (refreshed.error)
      throw new Error(
        extractError(refreshed.error, "Could not refresh offers."),
      );
  }
  const { data, error } = await supabase.rpc("get_my_waitlist");
  if (error)
    throw new Error(extractError(error, "Could not load your waitlist."));
  return data ?? [];
}

export async function fetchStudioDashboard(): Promise<StudioDashboard | null> {
  const { data, error } = await supabase.rpc("get_studio_dashboard");
  if (error) throw new Error(extractError(error, "Could not load studio."));
  return data?.[0] ?? null;
}

export async function fetchStudioWorkshops(): Promise<StudioWorkshop[]> {
  const { data, error } = await supabase.rpc("get_studio_workshops");
  if (error) throw new Error(extractError(error, "Could not load workshops."));
  return data ?? [];
}

export async function fetchStudioSessions(
  workshopId: string,
): Promise<StudioSession[]> {
  const { data, error } = await supabase.rpc("get_studio_sessions", {
    p_workshop_id: workshopId,
  });
  if (error) throw new Error(extractError(error, "Could not load sessions."));
  return data ?? [];
}

export async function fetchStudioRoster(
  sessionId: string,
): Promise<RosterEntry[]> {
  const { data, error } = await supabase.rpc("get_studio_roster", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(extractError(error, "Could not load roster."));
  return data ?? [];
}

export async function fetchStudioWaitlist(
  sessionId: string,
): Promise<WaitlistRosterEntry[]> {
  const { data, error } = await supabase.rpc("get_studio_waitlist", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(extractError(error, "Could not load waitlist."));
  return data ?? [];
}

export async function fetchStudioActivity(): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase.rpc("get_studio_activity");
  if (error) throw new Error(extractError(error, "Could not load activity."));
  return data ?? [];
}

export async function createStudio(
  name: string,
  slug: string,
  bio: string,
): Promise<void> {
  const { error } = await supabase.from("studios").insert({ name, slug, bio });
  if (error) throw new Error(extractError(error, "Could not create studio."));
}

export async function createWorkshop(workshop: {
  learning_outcomes?: string[];
  materials?: string[];
  prerequisites?: string;
  accessibility?: string;
  cancellation_policy?: string;
  studio_id: string;
  slug: string;
  title: string;
  category: string;
  short_description: string;
  long_description: string;
  duration_minutes: number;
  price: number;
  cover_image: string | null;
  instructor_name: string | null;
  is_published: boolean;
}): Promise<void> {
  const { error } = await supabase.from("workshops").insert(workshop);
  if (error) throw new Error(extractError(error, "Could not create workshop."));
}

export async function updateWorkshop(
  id: string,
  updates: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("workshops")
    .update(updates)
    .eq("id", id);
  if (error) throw new Error(extractError(error, "Could not update workshop."));
}

export async function createSession(session: {
  workshop_id: string;
  format: string;
  start_at: string;
  end_at: string;
  capacity: number;
  location: string;
  timezone: string | null;
}): Promise<void> {
  const { error } = await supabase.from("sessions").insert(session);
  if (error) throw new Error(extractError(error, "Could not create session."));
}

export async function fetchWorkshopForEdit(
  id: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(extractError(error, "Workshop not found."));
  return data;
}
export async function leaveWaitlist(id: string): Promise<void> {
  const { error } = await supabase.rpc("leave_waitlist_rpc", {
    p_waitlist_id: id,
  });
  if (error) throw new Error(extractError(error, "Could not leave waitlist."));
}
