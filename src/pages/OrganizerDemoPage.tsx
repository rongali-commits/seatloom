import { useState, useMemo } from 'react';
import {
  Calendar, Users, Check, X, Clock, MapPin, RotateCcw,
  AlertCircle, UserCheck, UserX, Mail, ChevronRight, Trash2,
} from 'lucide-react';
import { workshops, instructors } from '@/domain/seed';
import { getAvailableSeats, getSessionStatus, getActiveWaitlist, getBookedCount } from '@/domain/reducer';
import { useDemo } from '@/lib/demo-context';
import { formatDate, formatTime, formatDuration } from '@/lib/format';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { Modal } from '@/components/Modal';
import type { Session, CheckInStatus } from '@/domain/types';

export function OrganizerDemoPage() {
  const { state, dispatch, reset } = useDemo();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [view, setView] = useState<'week' | 'list'>('list');

  // Group sessions by date for week/list view
  const upcomingSessions = useMemo(() => {
    return state.sessions
      .filter((s) => new Date(s.startAt).getTime() > Date.now() - 24 * 60 * 60 * 1000)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }, [state.sessions]);

  const sessionsByDate = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    for (const s of upcomingSessions) {
      const dateKey = formatDate(s.startAt);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(s);
    }
    return groups;
  }, [upcomingSessions]);

  const dateKeys = Object.keys(sessionsByDate);

  const handleCheckIn = (bookingId: string, status: CheckInStatus) => {
    dispatch({ type: 'CHECK_IN', bookingId, status });
  };

  const handleAcceptOffer = (waitlistId: string) => {
    dispatch({ type: 'ACCEPT_OFFER', waitlistId });
  };

  const handleCancelBooking = (bookingId: string, sessionId: string, workshopId: string) => {
    dispatch({ type: 'CANCEL', bookingId });
  };

  const handleReschedule = (bookingId: string, newSessionId: string) => {
    dispatch({ type: 'RESCHEDULE', bookingId, newSessionId });
  };

  // Roster for the selected session detail modal
  const sessionBookings = selectedSession
    ? state.bookings.filter((b) => b.sessionId === selectedSession.id && b.status !== 'cancelled')
    : [];
  const sessionWaitlist = selectedSession ? getActiveWaitlist(state, selectedSession.id) : [];
  const availableSeats = selectedSession ? getAvailableSeats(state, selectedSession.id) : 0;

  const workshopForSession = (s: Session) => workshops.find((w) => w.id === s.workshopId);
  const instructorForWorkshop = (workshopId: string) =>
    instructors.find((i) => i.id === workshops.find((w) => w.id === workshopId)?.instructorId);

  // Stats
  const totalBookings = state.bookings.filter((b) => b.status === 'confirmed').length;
  const totalWaitlist = state.waitlist.filter((w) => w.status === 'waiting' || w.status === 'offered').length;
  const totalAttended = state.bookings.filter((b) => b.checkIn === 'attended').length;

  return (
    <div className="max-w-content mx-auto px-5 sm:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-plum-50 px-3 py-1 mb-3">
            <span className="text-xs font-medium text-plum-700">Interactive demo</span>
          </div>
          <h1 className="text-headline text-ink">Organizer dashboard</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Common Ground Studio — session roster, check-in, and waitlist management.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-full border border-ink/10 p-0.5">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                view === 'list' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                view === 'week' ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Week
            </button>
          </div>
          <button
            onClick={() => setResetModalOpen(true)}
            className="btn-secondary !py-2 text-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset demo
          </button>
        </div>
      </div>

      {/* Demo notice */}
      <div className="rounded-lg bg-paper-warm border border-ink/8 p-4 mb-6">
        <p className="text-xs text-ink-muted">
          <span className="font-medium text-ink-soft">Demo data stays on this device; no email is sent.</span>{' '}
          All bookings, check-ins, and waitlist actions are simulated. Use the reset button to restore seed data.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-ink-faint" />
            <span className="text-xs text-ink-muted">Bookings</span>
          </div>
          <p className="text-2xl font-display font-700 text-ink">{totalBookings}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-ink-faint" />
            <span className="text-xs text-ink-muted">On waitlist</span>
          </div>
          <p className="text-2xl font-display font-700 text-ink">{totalWaitlist}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-4 h-4 text-ink-faint" />
            <span className="text-xs text-ink-muted">Checked in</span>
          </div>
          <p className="text-2xl font-display font-700 text-ink">{totalAttended}</p>
        </div>
      </div>

      {/* Session list */}
      {dateKeys.length === 0 ? (
        <div className="text-center py-16">
          <AlertCircle className="w-10 h-10 text-ink-faint mx-auto mb-3" />
          <p className="text-sm text-ink-muted">No upcoming sessions. Reset the demo to restore seed data.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {dateKeys.map((dateKey) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-title text-ink">{dateKey}</h3>
                <div className="hairline flex-1" />
              </div>
              <div className="space-y-3">
                {sessionsByDate[dateKey].map((session) => {
                  const ws = workshopForSession(session);
                  const ins = ws ? instructorForWorkshop(ws.id) : null;
                  const booked = getBookedCount(state, session.id);
                  const status = getSessionStatus(state, session);
                  const waitlistCount = getActiveWaitlist(state, session.id).length;

                  return (
                    <div
                      key={session.id}
                      className="card p-4 hover:border-ink/15 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* Time block */}
                        <div className="text-center flex-shrink-0 w-16">
                          <p className="text-sm font-display font-700 text-ink">
                            {formatTime(session.startAt)}
                          </p>
                          <p className="text-xs text-ink-faint">
                            {ws ? formatDuration(ws.durationMinutes) : ''}
                          </p>
                        </div>

                        <div className="w-px h-12 bg-ink/10 flex-shrink-0" />

                        {/* Session info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {ws?.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-ink-muted">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {session.format === 'online' ? 'Online' : 'Bristol'}
                            </span>
                            <span>with {ins?.name}</span>
                          </div>
                        </div>

                        {/* Capacity */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-ink-faint" />
                            <span className="text-sm font-medium text-ink">
                              {booked}/{session.capacity}
                            </span>
                          </div>
                          {waitlistCount > 0 && (
                            <p className="text-xs text-plum-700 mt-0.5">
                              {waitlistCount} on waitlist
                            </p>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="flex-shrink-0">
                          {status === 'full' ? (
                            <span className="chip bg-plum-50 text-plum-700">Full</span>
                          ) : availableSeats === 1 ? (
                            <span className="chip bg-gold-400/15 text-gold-600">1 seat</span>
                          ) : (
                            <span className="chip bg-sage-50 text-sage-600">Open</span>
                          )}
                        </div>

                        {/* Expand button */}
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="flex-shrink-0 p-2 rounded-full hover:bg-ink/5 transition-colors"
                          aria-label={`Manage ${ws?.title} session`}
                        >
                          <ChevronRight className="w-5 h-5 text-ink-soft" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session detail modal */}
      <Modal
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Session roster"
        maxWidth="max-w-2xl"
      >
        {selectedSession && (
          <div className="space-y-5">
            {(() => {
              const ws = workshopForSession(selectedSession);
              const ins = ws ? instructorForWorkshop(ws.id) : null;
              return (
                <div className="flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-paper-warm flex-shrink-0">
                    <ImageWithFallback
                      src={ws?.coverImage || ''}
                      alt={ws?.title || ''}
                      className="w-full h-full object-cover"
                      fallbackText="Photo"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{ws?.title}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {formatDate(selectedSession.startAt)}, {formatTime(selectedSession.startAt)}–{formatTime(selectedSession.endAt)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {selectedSession.format === 'online' ? 'Online' : selectedSession.location}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Capacity bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">Capacity</span>
                <span className="text-sm text-ink-soft">
                  {sessionBookings.length}/{selectedSession.capacity} booked
                </span>
              </div>
              <div className="h-2 rounded-full bg-paper-warm overflow-hidden">
                <div
                  className="h-full bg-plum-600 transition-all rounded-full"
                  style={{ width: `${Math.min(100, (sessionBookings.length / selectedSession.capacity) * 100)}%` }}
                />
              </div>
            </div>

            {/* Roster */}
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wider text-ink-muted mb-3">Attendees</h4>
              {sessionBookings.length === 0 ? (
                <p className="text-sm text-ink-muted py-4 text-center">No bookings yet.</p>
              ) : (
                <div className="space-y-2">
                  {sessionBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 rounded-lg border border-ink/8 p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {booking.attendeeName}
                        </p>
                        <p className="text-xs text-ink-muted truncate flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {booking.attendeeEmail}
                        </p>
                      </div>

                      {/* Check-in status */}
                      <div className="flex items-center gap-1.5">
                        {booking.checkIn === 'attended' ? (
                          <span className="chip bg-sage-50 text-sage-600">
                            <Check className="w-3 h-3" /> In
                          </span>
                        ) : booking.checkIn === 'no-show' ? (
                          <span className="chip bg-red-50 text-red-600">
                            <X className="w-3 h-3" /> No-show
                          </span>
                        ) : (
                          <span className="chip bg-paper-warm text-ink-muted">Registered</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        {booking.checkIn !== 'attended' && (
                          <button
                            onClick={() => handleCheckIn(booking.id, 'attended')}
                            className="p-1.5 rounded-full hover:bg-sage-50 transition-colors"
                            aria-label={`Check in ${booking.attendeeName}`}
                            title="Check in"
                          >
                            <UserCheck className="w-4 h-4 text-sage-600" />
                          </button>
                        )}
                        {booking.checkIn !== 'no-show' && (
                          <button
                            onClick={() => handleCheckIn(booking.id, 'no-show')}
                            className="p-1.5 rounded-full hover:bg-red-50 transition-colors"
                            aria-label={`Mark ${booking.attendeeName} as no-show`}
                            title="Mark no-show"
                          >
                            <UserX className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCancelBooking(booking.id, selectedSession.id, booking.workshopId)}
                          className="p-1.5 rounded-full hover:bg-red-50 transition-colors"
                          aria-label={`Cancel booking for ${booking.attendeeName}`}
                          title="Cancel booking"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waitlist */}
            {sessionWaitlist.length > 0 && (
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-ink-muted mb-3">
                  Waitlist ({sessionWaitlist.length})
                </h4>
                <div className="space-y-2">
                  {sessionWaitlist.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-lg border border-ink/8 p-3"
                    >
                      <span className="text-xs font-display font-700 text-ink-faint w-5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {entry.attendeeName}
                        </p>
                        <p className="text-xs text-ink-muted truncate">{entry.attendeeEmail}</p>
                      </div>
                      {entry.status === 'offered' ? (
                        <div className="flex items-center gap-2">
                          <span className="chip bg-plum-50 text-plum-700">
                            <Clock className="w-3 h-3" />
                            Offered
                          </span>
                          {availableSeats > 0 && (
                            <button
                              onClick={() => handleAcceptOffer(entry.id)}
                              className="btn-primary !py-1.5 !px-3 text-xs"
                            >
                              Accept
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="chip bg-paper-warm text-ink-muted">Waiting</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent activity for this session */}
            {(() => {
              const sessionActivity = state.activity
                .filter((a) => a.message.toLowerCase().includes(selectedSession.id.toLowerCase()) || true)
                .slice(0, 5);
              return sessionActivity.length > 0 ? (
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-ink-muted mb-3">Recent activity</h4>
                  <div className="space-y-1.5">
                    {sessionActivity.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-xs text-ink-muted">
                        <span className="w-1 h-1 rounded-full bg-ink-faint" />
                        <span>{a.message}</span>
                        <span className="text-ink-faint ml-auto">
                          {new Date(a.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </Modal>

      {/* Reset confirmation */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset demo data"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            This will restore the original seed data and clear all demo bookings, waitlist entries,
            and check-ins. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setResetModalOpen(false)} className="btn-secondary flex-1">
              Keep current data
            </button>
            <button
              onClick={() => {
                reset();
                setResetModalOpen(false);
              }}
              className="btn-primary flex-1"
            >
              Reset to seed
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
