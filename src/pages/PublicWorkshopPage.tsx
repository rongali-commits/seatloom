import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock, MapPin, Users, Check, AlertCircle, ArrowLeft, Globe, Mail,
} from 'lucide-react';
import {
  fetchPublicWorkshop, fetchPublicWorkshopSessions, reserveSeat, joinWaitlist,
} from '@/lib/api';
import type { PublicWorkshop, PublicSession } from '@/lib/api';
import { useAsync } from '@/lib/use-async';
import { useAuth, setReturnPath } from '@/lib/auth';
import { formatDate, formatTime, formatDuration, formatPrice, getOffsetLabel } from '@/lib/format';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { Modal } from '@/components/Modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/LoadingState';
import { BookingTicket } from '@/components/BookingTicket';

export function PublicWorkshopPage() {
  const { studioSlug, workshopSlug } = useParams<{ studioSlug: string; workshopSlug: string }>();
  const { user } = useAuth();

  const workshopState = useAsync<PublicWorkshop | null>(
    () => fetchPublicWorkshop(studioSlug!, workshopSlug!),
    [studioSlug, workshopSlug]
  );
  const sessionsState = useAsync<PublicSession[]>(
    () => fetchPublicWorkshopSessions(workshopState.data?.id || ''),
    [workshopState.data?.id]
  );

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ token: string; session: PublicSession } | null>(null);

  const userTimezone = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
  }, []);
  const [displayTimezone, setDisplayTimezone] = useState(userTimezone);

  const workshop = workshopState.data;
  const sessions = sessionsState.data || [];
  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  if (workshopState.loading) return <LoadingState label="Loading workshop..." />;
  if (workshopState.error) return <ErrorState message={workshopState.error} onRetry={workshopState.refresh} />;
  if (!workshop) return <EmptyState title="Workshop not found" message="This workshop may not exist or is not published." />;

  const hasOnline = workshop.formats.includes('online');
  const timezoneOptions = useMemo(() => {
    const zones = [userTimezone, 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney'];
    return [...new Set(zones)];
  }, [userTimezone]);

  const tzForSession = (s: PublicSession) => {
    if (s.format === 'online' && s.timezone) return s.timezone;
    return displayTimezone;
  };

  const handleBook = async () => {
    if (!selectedSession) return;
    if (!user) {
      setReturnPath(window.location.pathname);
      setBookingModalOpen(false);
      window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setActionError(null);
    setSubmitting(true);
    try {
      const result = await reserveSeat(selectedSession.id);
      setSuccess({ token: result.check_in_token, session: selectedSession });
      setBookingModalOpen(false);
      sessionsState.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!selectedSession) return;
    if (!user) {
      setReturnPath(window.location.pathname);
      setWaitlistModalOpen(false);
      window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setActionError(null);
    setSubmitting(true);
    try {
      await joinWaitlist(selectedSession.id);
      setWaitlistModalOpen(false);
      sessionsState.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not join waitlist.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="max-w-content mx-auto px-5 sm:px-8 pt-6">
        <Link to={`/s/${studioSlug}`} className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {workshop.studio_name}
        </Link>
      </div>

      <section className="max-w-content mx-auto px-5 sm:px-8 pt-6 pb-10">
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-7 lg:col-span-8">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-paper-warm">
              {workshop.cover_image && (
                <ImageWithFallback
                  src={workshop.cover_image}
                  alt={workshop.title}
                  className="w-full h-full object-cover"
                  fallbackText="Workshop cover photograph"
                />
              )}
            </div>
          </div>
          <div className="md:col-span-5 lg:col-span-4 flex flex-col justify-center">
            <h1 className="text-headline text-ink text-balance mb-3">{workshop.title}</h1>
            <p className="text-ink-soft text-pretty mb-5">{workshop.short_description}</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-ink-soft">
                <Clock className="w-4 h-4 text-ink-faint" />
                {formatDuration(workshop.duration_minutes)}
              </div>
              <div className="flex items-center gap-3 text-ink-soft">
                <span className="text-base font-medium text-plum-700">{formatPrice(workshop.price)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {workshop.gallery.length > 1 && (
        <section className="max-w-content mx-auto px-5 sm:px-8 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {workshop.gallery.map((img, i) => (
              <div key={i} className={`relative overflow-hidden rounded-lg bg-paper-warm ${i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square'}`}>
                <ImageWithFallback src={img} alt={`${workshop.title} gallery image ${i + 1}`} className="w-full h-full object-cover" fallbackText="Gallery image" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-content mx-auto px-5 sm:px-8 pb-16">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-7 lg:col-span-8 space-y-10">
            <div>
              <h2 className="text-title text-ink mb-4">About this workshop</h2>
              <p className="text-ink-soft text-pretty leading-relaxed">{workshop.long_description}</p>
            </div>

            {workshop.instructor_name && (
              <div className="flex gap-5 items-start">
                {workshop.instructor_photo_url && (
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-paper-warm flex-shrink-0">
                    <ImageWithFallback src={workshop.instructor_photo_url} alt={workshop.instructor_name} className="w-full h-full object-cover" fallbackText="Photo" />
                  </div>
                )}
                <div>
                  <h3 className="text-title text-ink mb-1">{workshop.instructor_name}</h3>
                  {workshop.instructor_bio && <p className="text-sm text-ink-soft text-pretty leading-relaxed">{workshop.instructor_bio}</p>}
                </div>
              </div>
            )}

            {workshop.learning_outcomes.length > 0 && (
              <div>
                <h3 className="text-title text-ink mb-4">What you'll learn</h3>
                <ul className="space-y-2.5">
                  {workshop.learning_outcomes.map((o, i) => (
                    <li key={i} className="flex items-start gap-3 text-ink-soft">
                      <Check className="w-4 h-4 text-plum-600 mt-0.5 flex-shrink-0" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {workshop.materials.length > 0 && (
              <div>
                <h3 className="text-title text-ink mb-4">Materials</h3>
                <ul className="space-y-2.5">
                  {workshop.materials.map((m, i) => (
                    <li key={i} className="flex items-start gap-3 text-ink-soft">
                      <span className="w-1 h-1 rounded-full bg-ink-faint mt-2.5 flex-shrink-0" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {workshop.prerequisites && (
              <div>
                <h3 className="text-title text-ink mb-2">Prerequisites</h3>
                <p className="text-ink-soft text-pretty">{workshop.prerequisites}</p>
              </div>
            )}

            {workshop.accessibility && (
              <div className="bg-paper-panel rounded-xl p-6">
                <h3 className="text-title text-ink mb-2">Accessibility</h3>
                <p className="text-ink-soft text-pretty">{workshop.accessibility}</p>
              </div>
            )}

            {workshop.cancellation_policy && (
              <div>
                <h3 className="text-title text-ink mb-2">Cancellation policy</h3>
                <p className="text-ink-soft text-pretty">{workshop.cancellation_policy}</p>
              </div>
            )}
          </div>

          <div className="md:col-span-5 lg:col-span-4">
            <div className="sticky top-24 space-y-5">
              {hasOnline && (
                <div>
                  <label htmlFor="tz-select" className="field-label flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Display timezone
                  </label>
                  <select id="tz-select" value={displayTimezone} onChange={(e) => setDisplayTimezone(e.target.value)} className="field-input">
                    {timezoneOptions.map((tz) => (
                      <option key={tz} value={tz}>{tz.replace(/_/g, ' ')} ({getOffsetLabel(tz)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <h3 className="text-title text-ink mb-3">Choose a session</h3>
                {sessionsState.loading ? (
                  <p className="text-sm text-ink-muted">Loading sessions...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-ink-muted">No upcoming sessions scheduled.</p>
                ) : (
                  <div className="space-y-2.5">
                    {sessions.map((session) => {
                      const tz = tzForSession(session);
                      const isSelected = selectedSessionId === session.id;
                      return (
                        <button
                          key={session.id}
                          onClick={() => setSelectedSessionId(session.id)}
                          className={`w-full text-left rounded-lg border p-4 transition-all ${
                            isSelected ? 'border-plum-500 bg-plum-50/50 ring-1 ring-plum-500' : 'border-ink/10 bg-paper-card hover:border-ink/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-ink">{formatDate(session.start_at, tz)}</span>
                                <span className="text-xs text-ink-muted">{formatTime(session.start_at, tz)}-{formatTime(session.end_at, tz)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-ink-muted">
                                <MapPin className="w-3 h-3" />
                                {session.format === 'online' ? 'Online' : session.location}
                              </div>
                            </div>
                            <div className="text-right">
                              {session.is_full ? (
                                <span className="text-xs font-medium text-plum-700">Waitlist</span>
                              ) : session.available_seats === 1 ? (
                                <span className="text-xs font-medium text-gold-600">1 seat</span>
                              ) : (
                                <span className="text-xs text-ink-muted">{session.available_seats} seats</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSession && (
                <div className="space-y-3">
                  {selectedSession.is_full ? (
                    <button onClick={() => setWaitlistModalOpen(true)} className="btn-primary w-full">
                      Join waitlist
                    </button>
                  ) : (
                    <button onClick={() => setBookingModalOpen(true)} className="btn-primary w-full">
                      Book this session
                    </button>
                  )}
                  <p className="text-xs text-ink-faint text-center">
                    {formatPrice(workshop.price)}
                  </p>
                  {!user && (
                    <p className="text-xs text-ink-muted text-center">
                      You'll need to sign in to complete your booking.
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-lg bg-paper-warm p-4 text-xs text-ink-muted leading-relaxed">
                <p className="font-medium text-ink-soft mb-1">Email delivery</p>
                <p>
                  Email delivery is not currently configured. Your in-app booking status is authoritative.
                  No confirmation email is sent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal open={bookingModalOpen} onClose={() => { setBookingModalOpen(false); setActionError(null); }} title="Book your session">
        {selectedSession && (
          <div className="space-y-4">
            <div className="rounded-lg bg-paper-warm p-4">
              <p className="text-sm font-medium text-ink">{workshop.title}</p>
              <p className="text-xs text-ink-muted mt-1">
                {formatDate(selectedSession.start_at, tzForSession(selectedSession))}, {formatTime(selectedSession.start_at, tzForSession(selectedSession))}-{formatTime(selectedSession.end_at, tzForSession(selectedSession))}
              </p>
              <p className="text-xs text-ink-muted">{selectedSession.format === 'online' ? 'Online' : selectedSession.location}</p>
            </div>
            {actionError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setBookingModalOpen(false); setActionError(null); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleBook} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Booking...' : 'Confirm booking'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={waitlistModalOpen} onClose={() => { setWaitlistModalOpen(false); setActionError(null); }} title="Join the waitlist">
        {selectedSession && (
          <div className="space-y-4">
            <div className="rounded-lg bg-plum-50 p-4">
              <p className="text-sm text-plum-700">This session is full. If a seat opens up, you'll get a 15-minute offer to claim it.</p>
            </div>
            {actionError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setWaitlistModalOpen(false); setActionError(null); }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleJoinWaitlist} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Joining...' : 'Join waitlist'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!success} onClose={() => { setSuccess(null); sessionsState.refresh(); }} title="Booking confirmed">
        {success && (
          <div className="space-y-4">
            <BookingTicket
              workshopTitle={workshop.title}
              sessionStartAt={success.session.start_at}
              sessionEndAt={success.session.end_at}
              sessionLocation={success.session.format === 'online' ? 'Online' : success.session.location}
              checkInToken={success.token}
              timezone={tzForSession(success.session)}
            />
            <p className="text-xs text-ink-faint">
              You can view and manage this booking from My Bookings. Email delivery is not configured;
              your in-app booking status is authoritative.
            </p>
            <button onClick={() => { setSuccess(null); sessionsState.refresh(); }} className="btn-primary w-full">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
