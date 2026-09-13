import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Modal } from "@/components/Modal";
import {
  demoReducer,
  getAvailableSeats,
  getSessionStatus,
  validateAttendee,
} from "@/domain/reducer";
import {
  categoryColors,
  categoryLabels,
  instructors,
  workshops,
} from "@/domain/seed";
import type { Session } from "@/domain/types";
import { useDemo } from "@/lib/demo-context";
import {
  formatDate,
  formatDuration,
  formatPrice,
  formatTime,
  getOffsetLabel,
} from "@/lib/format";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Globe,
  Mail,
  MapPin,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

export function WorkshopDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { state, dispatch } = useDemo();

  const workshop = workshops.find((w) => w.slug === slug);
  const instructor = workshop
    ? instructors.find((i) => i.id === workshop.instructorId)
    : null;

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [successTicket, setSuccessTicket] = useState<{
    id: string;
    session: Session;
    name: string;
  } | null>(null);

  // User's local timezone
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  // For online sessions, offer timezone selection
  const [displayTimezone, setDisplayTimezone] = useState<string>(userTimezone);

  if (!workshop || !instructor) {
    return (
      <div className="max-w-content mx-auto px-5 sm:px-8 py-24 text-center">
        <AlertCircle className="w-12 h-12 text-ink-faint mx-auto mb-4" />
        <h1 className="text-headline text-ink mb-3">Workshop not found</h1>
        <p className="text-ink-muted mb-6">
          This workshop may have been removed or the link is incorrect.
        </p>
        <Link to="/" className="btn-primary">
          Back to workshops
        </Link>
      </div>
    );
  }

  const workshopSessions = state.sessions
    .filter((s) => s.workshopId === workshop.id)
    .filter((s) => new Date(s.startAt).getTime() > Date.now())
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const selectedSession = state.sessions.find(
    (s) => s.id === selectedSessionId,
  );
  const sessionStatus = selectedSession
    ? getSessionStatus(state, selectedSession)
    : "open";

  // User's existing booking for this workshop (any session)
  // For demo: track the "current user's" booking by email match is not possible without auth.
  // Instead, show all bookings for this workshop's selected session in the demo.

  const tzForSession = (s: Session) => {
    return s.format === "online"
      ? displayTimezone
      : s.timezone || "Europe/London";
  };

  const handleBook = () => {
    if (!selectedSession) return;
    const errs = validateAttendee(name, email);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const bookingId = `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const candidate = {
      type: "BOOK" as const,
      id: bookingId,
      sessionId: selectedSession.id,
      workshopId: workshop.id,
      attendeeName: name,
      attendeeEmail: email,
    };
    if (
      !demoReducer(state, candidate).bookings.some((b) => b.id === bookingId)
    ) {
      setErrors({
        email:
          "No seat was booked. You may already be registered, or the seat is now held. Check the organizer demo.",
      });
      return;
    }
    dispatch({
      type: "BOOK",
      id: bookingId,
      sessionId: selectedSession.id,
      workshopId: workshop.id,
      attendeeName: name,
      attendeeEmail: email,
    });
    setSuccessTicket({
      id: bookingId,
      session: selectedSession,
      name: name.trim(),
    });
    setBookingModalOpen(false);
    setName("");
    setEmail("");
    setErrors({});
  };

  const handleJoinWaitlist = () => {
    if (!selectedSession) return;
    const errs = validateAttendee(name, email);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    dispatch({
      type: "JOIN_WAITLIST",
      sessionId: selectedSession.id,
      workshopId: workshop.id,
      attendeeName: name,
      attendeeEmail: email,
    });
    setWaitlistModalOpen(false);
    setName("");
    setEmail("");
    setErrors({});
  };

  const hasOnline = workshop.formats.includes("online");
  const timezoneOptions = [
    ...new Set([
      userTimezone,
      "Europe/London",
      "America/New_York",
      "Asia/Kolkata",
      "Asia/Tokyo",
      "Australia/Sydney",
    ]),
  ];

  return (
    <div>
      {/* Back link */}
      <div className="max-w-content mx-auto px-5 sm:px-8 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All workshops
        </Link>
      </div>

      {/* Hero */}
      <section className="max-w-content mx-auto px-5 sm:px-8 pt-6 pb-10">
        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-7 lg:col-span-8">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-paper-warm">
              <ImageWithFallback
                src={workshop.coverImage}
                alt={workshop.title}
                className="w-full h-full object-cover"
                fallbackText="Workshop cover photograph"
              />
              <div className="absolute top-4 left-4">
                <span className={`chip ${categoryColors[workshop.category]}`}>
                  {categoryLabels[workshop.category]}
                </span>
              </div>
            </div>
          </div>
          <div className="md:col-span-5 lg:col-span-4 flex flex-col justify-center">
            <h1 className="text-headline text-ink text-balance mb-3">
              {workshop.title}
            </h1>
            <p className="text-ink-soft text-pretty mb-5">
              {workshop.shortDescription}
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-ink-soft">
                <Clock className="w-4 h-4 text-ink-faint" />
                {formatDuration(workshop.durationMinutes)}
              </div>
              <div className="flex items-center gap-3 text-ink-soft">
                <Users className="w-4 h-4 text-ink-faint" />
                Small groups
                {workshopSessions.length
                  ? `, max ${Math.max(...workshopSessions.map((s) => s.capacity))} per session`
                  : ", new dates coming soon"}
              </div>
              <div className="flex items-center gap-3 text-ink-soft">
                <span className="text-base font-medium text-plum-700">
                  {formatPrice(workshop.price)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      {workshop.gallery.length > 1 && (
        <section className="max-w-content mx-auto px-5 sm:px-8 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {workshop.gallery.map((img, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-lg bg-paper-warm ${
                  i === 0
                    ? "col-span-2 row-span-2 aspect-square"
                    : "aspect-square"
                }`}
              >
                <ImageWithFallback
                  src={img}
                  alt={`${workshop.title} gallery image ${i + 1}`}
                  className="w-full h-full object-cover"
                  fallbackText="Gallery image"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main content */}
      <section className="max-w-content mx-auto px-5 sm:px-8 pb-16">
        <div className="grid md:grid-cols-12 gap-10">
          {/* Left: details */}
          <div className="md:col-span-7 lg:col-span-8 space-y-10">
            {/* About */}
            <div>
              <h2 className="text-title text-ink mb-4">About this workshop</h2>
              <p className="text-ink-soft text-pretty leading-relaxed">
                {workshop.longDescription}
              </p>
            </div>

            {/* Instructor */}
            <div className="flex gap-5 items-start">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-paper-warm flex-shrink-0">
                <span
                  className="w-full h-full flex items-center justify-center text-2xl text-plum-700 font-semibold"
                  aria-hidden="true"
                >
                  {instructor.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <div>
                <h3 className="text-title text-ink mb-1">{instructor.name}</h3>
                <p className="text-sm text-ink-soft text-pretty leading-relaxed">
                  {instructor.bio}
                </p>
              </div>
            </div>

            {/* Learning outcomes */}
            <div>
              <h3 className="text-title text-ink mb-4">What you'll learn</h3>
              <ul className="space-y-2.5">
                {workshop.learningOutcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-3 text-ink-soft">
                    <Check className="w-4 h-4 text-plum-600 mt-0.5 flex-shrink-0" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Materials */}
            <div>
              <h3 className="text-title text-ink mb-4">Materials</h3>
              <ul className="space-y-2.5">
                {workshop.materials.map((mat, i) => (
                  <li key={i} className="flex items-start gap-3 text-ink-soft">
                    <span className="w-1 h-1 rounded-full bg-ink-faint mt-2.5 flex-shrink-0" />
                    <span>{mat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Prerequisites */}
            <div>
              <h3 className="text-title text-ink mb-2">Prerequisites</h3>
              <p className="text-ink-soft text-pretty">
                {workshop.prerequisites}
              </p>
            </div>

            {/* Accessibility */}
            <div className="bg-paper-panel rounded-xl p-6">
              <h3 className="text-title text-ink mb-2">Accessibility</h3>
              <p className="text-ink-soft text-pretty">
                {workshop.accessibility}
              </p>
            </div>

            {/* Cancellation policy */}
            <div>
              <h3 className="text-title text-ink mb-2">Cancellation policy</h3>
              <p className="text-ink-soft text-pretty">
                {workshop.cancellationPolicy}
              </p>
            </div>
          </div>

          {/* Right: session selector + booking */}
          <div className="md:col-span-5 lg:col-span-4">
            <div className="sticky top-24 space-y-5">
              {/* Timezone selector for online sessions */}
              {hasOnline && (
                <div>
                  <label
                    htmlFor="tz-select"
                    className="field-label flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Display timezone
                  </label>
                  <select
                    id="tz-select"
                    value={displayTimezone}
                    onChange={(e) => setDisplayTimezone(e.target.value)}
                    className="field-input"
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, " ")} ({getOffsetLabel(tz)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Session selector */}
              <div>
                <h3 className="text-title text-ink mb-3">Choose a session</h3>
                <div className="space-y-2.5">
                  {workshopSessions.map((session) => {
                    const seats = getAvailableSeats(state, session.id);
                    const status = getSessionStatus(state, session);
                    const tz = tzForSession(session);
                    const isSelected = selectedSessionId === session.id;

                    return (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSessionId(session.id)}
                        className={`w-full text-left rounded-lg border p-4 transition-all ${
                          isSelected
                            ? "border-plum-500 bg-plum-50/50 ring-1 ring-plum-500"
                            : "border-ink/10 bg-paper-card hover:border-ink/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-ink">
                                {formatDate(session.startAt, tz)}
                              </span>
                              <span className="text-xs text-ink-muted">
                                {formatTime(session.startAt, tz)}–
                                {formatTime(session.endAt, tz)}
                              </span>
                            </div>
                            <p className="text-xs text-ink-muted mb-1">{tz}</p>
                            <div className="flex items-center gap-2 text-xs text-ink-muted">
                              <MapPin className="w-3 h-3" />
                              {session.format === "online"
                                ? "Online"
                                : session.location}
                            </div>
                          </div>
                          <div className="text-right">
                            {status === "full" ? (
                              <span className="text-xs font-medium text-plum-700">
                                Waitlist
                              </span>
                            ) : seats === 1 ? (
                              <span className="text-xs font-medium text-gold-600">
                                1 seat
                              </span>
                            ) : (
                              <span className="text-xs text-ink-muted">
                                {seats} seats
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Booking action */}
              {selectedSession ? (
                <div className="space-y-3">
                  {sessionStatus === "open" ? (
                    <button
                      onClick={() => setBookingModalOpen(true)}
                      className="btn-primary w-full"
                    >
                      Book this session
                    </button>
                  ) : (
                    <button
                      onClick={() => setWaitlistModalOpen(true)}
                      className="btn-primary w-full"
                    >
                      Join waitlist
                    </button>
                  )}
                  <p className="text-xs text-ink-faint text-center">
                    {formatPrice(workshop.price)} — no payment required for this
                    demo
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-muted text-center py-4">
                  Select a session to book
                </p>
              )}

              {/* Demo notice */}
              <div className="rounded-lg bg-paper-warm p-4 text-xs text-ink-muted leading-relaxed">
                <p className="font-medium text-ink-soft mb-1">Demo booking</p>
                <p>
                  Demo data stays on this device; no email is sent. Bookings,
                  cancellations, and waitlist offers are simulated for
                  demonstration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking modal */}
      <Modal
        open={bookingModalOpen}
        onClose={() => {
          setBookingModalOpen(false);
          setErrors({});
        }}
        title="Book your session"
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="rounded-lg bg-paper-warm p-4">
              <p className="text-sm font-medium text-ink">{workshop.title}</p>
              <p className="text-xs text-ink-muted mt-1">
                {formatDate(
                  selectedSession.startAt,
                  tzForSession(selectedSession),
                )}
                ,{" "}
                {formatTime(
                  selectedSession.startAt,
                  tzForSession(selectedSession),
                )}
                –
                {formatTime(
                  selectedSession.endAt,
                  tzForSession(selectedSession),
                )}
              </p>
              <p className="text-xs text-ink-muted">
                {selectedSession.format === "online"
                  ? "Online"
                  : selectedSession.location}
              </p>
            </div>

            <div>
              <label htmlFor="bk-name" className="field-label">
                Full name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-ink-faint" />
                <input
                  id="bk-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-input pl-10"
                  placeholder="Your name"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "bk-name-err" : undefined}
                />
              </div>
              {errors.name && (
                <p id="bk-name-err" className="text-xs text-red-600 mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="bk-email" className="field-label">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-ink-faint" />
                <input
                  id="bk-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input pl-10"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "bk-email-err" : undefined}
                />
              </div>
              {errors.email && (
                <p id="bk-email-err" className="text-xs text-red-600 mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setBookingModalOpen(false);
                  setErrors({});
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={handleBook} className="btn-primary flex-1">
                Confirm booking
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Waitlist modal */}
      <Modal
        open={waitlistModalOpen}
        onClose={() => {
          setWaitlistModalOpen(false);
          setErrors({});
        }}
        title="Join the waitlist"
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="rounded-lg bg-plum-50 p-4">
              <p className="text-sm text-plum-700">
                This session is full. If a seat opens up, you'll get a 15-minute
                offer to claim it.
              </p>
            </div>
            <div>
              <label htmlFor="wl-name" className="field-label">
                Full name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-ink-faint" />
                <input
                  id="wl-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-input pl-10"
                  placeholder="Your name"
                  aria-invalid={!!errors.name}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-600 mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="wl-email" className="field-label">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-ink-faint" />
                <input
                  id="wl-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input pl-10"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setWaitlistModalOpen(false);
                  setErrors({});
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinWaitlist}
                className="btn-primary flex-1"
              >
                Join waitlist
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Success ticket */}
      <Modal
        open={!!successTicket}
        onClose={() => setSuccessTicket(null)}
        title="Booking confirmed"
      >
        {successTicket && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center">
                <Check className="w-6 h-6 text-sage-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">
                  You're booked, {successTicket.name}!
                </p>
                <p className="text-xs text-ink-muted">
                  Ticket ID: {successTicket.id}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-paper-warm p-4 space-y-1.5">
              <p className="text-sm font-medium text-ink">{workshop.title}</p>
              <p className="text-xs text-ink-muted">
                {formatDate(
                  successTicket.session.startAt,
                  tzForSession(successTicket.session),
                )}
                ,{" "}
                {formatTime(
                  successTicket.session.startAt,
                  tzForSession(successTicket.session),
                )}
                –
                {formatTime(
                  successTicket.session.endAt,
                  tzForSession(successTicket.session),
                )}
              </p>
              <p className="text-xs text-ink-muted">
                {successTicket.session.format === "online"
                  ? "Online"
                  : successTicket.session.location}
              </p>
            </div>
            <p className="text-xs text-ink-faint">
              This is a demo booking. No confirmation email is sent. You can
              cancel or reschedule from the organizer demo.
            </p>
            <button
              onClick={() => setSuccessTicket(null)}
              className="btn-primary w-full"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
