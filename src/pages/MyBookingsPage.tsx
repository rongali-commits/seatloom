import { BookingTicket } from "@/components/BookingTicket";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/LoadingState";
import { Modal } from "@/components/Modal";
import type { MyBooking, MyWaitlistEntry, PublicSession } from "@/lib/api";
import {
  acceptOffer,
  cancelBooking,
  fetchMyBookings,
  fetchMyWaitlist,
  fetchPublicWorkshopSessions,
  leaveWaitlist,
  rescheduleBooking,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import {
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

export function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const bookingsState = useAsync<MyBooking[]>(fetchMyBookings, [user?.id]);
  const waitlistState = useAsync<MyWaitlistEntry[]>(fetchMyWaitlist, [
    user?.id,
  ]);
  const refreshWaitlist = waitlistState.refresh;
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshWaitlist, 30000);
    return () => clearInterval(interval);
  }, [user, refreshWaitlist]);

  const [cancelTarget, setCancelTarget] = useState<MyBooking | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<MyBooking | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  if (authLoading) return <LoadingState />;
  if (!user) {
    return (
      <div className="max-w-content mx-auto px-5 sm:px-8 py-24 text-center">
        <h1 className="text-headline text-ink mb-3">Sign in required</h1>
        <p className="text-sm text-ink-muted mb-6">
          Sign in to view your bookings and waitlist entries.
        </p>
        <Link to="/login?from=/my-bookings" className="btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  const bookings = bookingsState.data || [];
  const waitlist = waitlistState.data || [];
  const activeBookings = bookings.filter((b) => b.cancelled_at === null);
  const cancelledBookings = bookings.filter((b) => b.cancelled_at !== null);

  const tzForBooking = (b: MyBooking) => {
    if (b.session_format === "in-person" && b.session_timezone)
      return b.session_timezone;
    return userTimezone;
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setActionError(null);
    setSubmitting(true);
    try {
      await cancelBooking(cancelTarget.id);
      setCancelTarget(null);
      bookingsState.refresh();
      waitlistState.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not cancel.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOffer = async (waitlistId: string) => {
    setActionError(null);
    setSubmitting(true);
    try {
      await acceptOffer(waitlistId);
      waitlistState.refresh();
      bookingsState.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not accept offer.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const handleLeave = async (id: string) => {
    setSubmitting(true);
    setActionError(null);
    try {
      await leaveWaitlist(id);
      waitlistState.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not leave waitlist.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-content mx-auto px-5 sm:px-8 py-8">
      <h1 className="text-headline text-ink mb-2">My bookings</h1>
      <button className="btn-secondary mb-4" onClick={() => { bookingsState.refresh(); waitlistState.refresh(); }}>Refresh bookings and offers</button>
      <p className="text-xs text-ink-muted mb-4">Booking updates are in-app only. Waitlist offers refresh every 30 seconds while this page is open and expire after 15 minutes.</p>
      <p className="text-sm text-ink-muted mb-8">
        Manage your workshop bookings and waitlist entries.
      </p>

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 mb-6">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {bookingsState.loading && waitlistState.loading ? (
        <LoadingState />
      ) : bookingsState.error || waitlistState.error ? (
        <ErrorState
          message={
            bookingsState.error ||
            waitlistState.error ||
            "Could not load bookings."
          }
          onRetry={() => {
            bookingsState.refresh();
            waitlistState.refresh();
          }}
        />
      ) : activeBookings.length === 0 &&
        waitlist.length === 0 &&
        cancelledBookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          message="Browse workshops and book a session to see it here."
        />
      ) : (
        <div className="space-y-8">
          {activeBookings.length > 0 && (
            <section>
              <h2 className="text-title text-ink mb-4">Active bookings</h2>
              <div className="space-y-4">
                {activeBookings.map((b) => (
                  <div key={b.id} className="card p-5">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/s/${b.studio_slug}/${b.workshop_slug}`}
                          className="text-title text-ink hover:text-plum-700 transition-colors"
                        >
                          {b.workshop_title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-ink-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(b.session_start_at, tzForBooking(b))}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(b.session_start_at, tzForBooking(b))} (
                            {tzForBooking(b)})
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {b.session_format === "online"
                              ? "Online"
                              : b.session_location}
                          </span>
                        </div>
                        {b.session_is_cancelled && (
                          <p className="text-xs text-red-600 mt-2">
                            This session has been cancelled by the organizer.
                          </p>
                        )}
                        <div className="mt-3">
                          <BookingTicket
                            workshopTitle={b.workshop_title}
                            sessionStartAt={b.session_start_at}
                            sessionEndAt={b.session_end_at}
                            sessionLocation={
                              b.session_format === "online"
                                ? "Online"
                                : b.session_location
                            }
                            checkInToken={b.check_in_token}
                            timezone={tzForBooking(b)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setRescheduleTarget(b);
                            setActionError(null);
                          }}
                          className="btn-secondary !py-2 text-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reschedule
                        </button>
                        <button
                          onClick={() => {
                            setCancelTarget(b);
                            setActionError(null);
                          }}
                          className="btn-secondary !py-2 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {waitlist.length > 0 && (
            <section>
              <h2 className="text-title text-ink mb-4">Waitlist</h2>
              <div className="space-y-3">
                {waitlist.map((w) => {
                  const isOffered = w.status === "offered";
                  const isExpired =
                    w.expires_at &&
                    new Date(w.expires_at).getTime() < Date.now();
                  return (
                    <div
                      key={w.id}
                      className={`card p-4 ${isOffered ? "border-plum-300" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/s/${w.studio_slug}/${w.workshop_slug}`}
                            className="text-sm font-medium text-ink hover:text-plum-700 transition-colors"
                          >
                            {w.workshop_title}
                          </Link>
                          <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {formatDate(w.session_start_at)}
                            </span>
                            <span>
                              {w.session_format === "online"
                                ? "Online"
                                : w.session_location}
                            </span>
                          </div>
                          {isOffered && !isExpired && (
                            <p className="text-xs text-plum-700 mt-2">
                              A seat is available! Offer expires{" "}
                              {formatTime(w.expires_at!)}. Accept it now.
                            </p>
                          )}
                          {isOffered && isExpired && (
                            <p className="text-xs text-ink-muted mt-2">
                              This offer has expired and will be passed to the
                              next person.
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleLeave(w.id)}
                            disabled={submitting}
                            className="btn-secondary !py-2 text-xs mb-2"
                          >
                            Leave waitlist
                          </button>
                          {isOffered && !isExpired ? (
                            <button
                              onClick={() => handleAcceptOffer(w.id)}
                              disabled={submitting}
                              className="btn-primary !py-2 text-xs"
                            >
                              Accept offer
                            </button>
                          ) : (
                            <span className="chip bg-paper-warm text-ink-muted">
                              {w.status === "offered" ? "Expired" : "Waiting"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {cancelledBookings.length > 0 && (
            <section>
              <h2 className="text-title text-ink mb-4">Cancelled bookings</h2>
              <div className="space-y-3">
                {cancelledBookings.map((b) => (
                  <div key={b.id} className="card p-4 opacity-60">
                    <p className="text-sm font-medium text-ink">
                      {b.workshop_title}
                    </p>
                    <p className="text-xs text-ink-muted mt-1">
                      {formatDate(b.session_start_at, tzForBooking(b))} -
                      Cancelled{" "}
                      {b.cancelled_at ? formatDate(b.cancelled_at) : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel booking"
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-soft">
              Cancel your booking for{" "}
              <span className="font-medium text-ink">
                {cancelTarget.workshop_title}
              </span>{" "}
              on{" "}
              {formatDate(
                cancelTarget.session_start_at,
                tzForBooking(cancelTarget),
              )}
              ?
            </p>
            <p className="text-xs text-ink-muted">
              This will free your seat and offer it to the next person on the
              waitlist. This action cannot be undone.
            </p>
            {actionError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="btn-secondary flex-1"
              >
                Keep booking
              </button>
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? "Cancelling..." : "Cancel booking"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <RescheduleModal
        booking={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={() => {
          bookingsState.refresh();
          waitlistState.refresh();
        }}
      />
    </div>
  );
}

function RescheduleModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: MyBooking | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    setSelectedSession(null);
    setError(null);
    fetchPublicWorkshopSessions(booking.workshop_id)
      .then((data) => {
        setSessions(data.filter((s) => s.id !== booking.session_id));
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Could not load sessions.",
        );
        setLoading(false);
      });
  }, [booking]);

  const handleReschedule = async () => {
    if (!booking || !selectedSession) return;
    setSubmitting(true);
    setError(null);
    try {
      await rescheduleBooking(booking.id, selectedSession);
      onClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reschedule.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal open={!!booking} onClose={onClose} title="Reschedule booking">
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          Move your booking for{" "}
          <span className="font-medium text-ink">{booking.workshop_title}</span>{" "}
          to a different session.
        </p>
        {loading ? (
          <p className="text-sm text-ink-muted">
            Loading available sessions...
          </p>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No other upcoming sessions available for this workshop.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((s) => (
              <button
                key={s.id}
                disabled={s.is_full || s.available_seats < 1}
                onClick={() => setSelectedSession(s.id)}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  selectedSession === s.id
                    ? "border-plum-500 bg-plum-50/50"
                    : "border-ink/10 hover:border-ink/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink">
                    {formatDate(s.start_at)}, {formatTime(s.start_at)}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {s.is_full ? "Full" : `${s.available_seats} seats`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={submitting || !selectedSession}
            className="btn-primary flex-1"
          >
            {submitting ? "Rescheduling..." : "Confirm reschedule"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
