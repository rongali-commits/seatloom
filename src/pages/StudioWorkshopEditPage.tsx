import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/LoadingState";
import { Modal } from "@/components/Modal";
import {
  cancelSession,
  checkIn,
  createSession,
  createWorkshop,
  fetchStudioDashboard,
  fetchStudioRoster,
  fetchStudioSessions,
  fetchStudioWaitlist,
  fetchWorkshopForEdit,
  updateSessionCapacity,
  updateWorkshop,
  type RosterEntry,
  type StudioDashboard,
  type StudioSession,
  type WaitlistRosterEntry,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  MapPin,
  Plus,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

interface WorkshopFormData {
  title: string;
  slug: string;
  category: string;
  short_description: string;
  long_description: string;
  duration_minutes: number;
  price: number;
  cover_image: string;
  instructor_name: string;
  is_published: boolean;
}

export function StudioWorkshopEditPage() {
  const { workshopId } = useParams<{ workshopId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const dashboardState = useAsync<StudioDashboard | null>(
    fetchStudioDashboard,
    [user?.id],
  );
  const isNew = !workshopId || workshopId === "new";

  const [form, setForm] = useState<WorkshopFormData>({
    title: "",
    slug: "",
    category: "pottery",
    short_description: "",
    long_description: "",
    duration_minutes: 180,
    price: 0,
    cover_image: "",
    instructor_name: "",
    is_published: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(!isNew);
  const [details, setDetails] = useState({
    learning_outcomes: "",
    materials: "",
    prerequisites: "",
    accessibility: "",
    cancellation_policy:
      "Free booking. Cancel or reschedule before the session starts, subject to availability.",
  });
  useEffect(() => {
    if (isNew || !user || !workshopId) return;
    let active = true;
    setEditLoading(true);
    fetchWorkshopForEdit(workshopId)
      .then((data) => {
        if (!active) return;
        setDetails({
          learning_outcomes: Array.isArray(data.learning_outcomes)
            ? data.learning_outcomes.join("\n")
            : "",
          materials: Array.isArray(data.materials)
            ? data.materials.join("\n")
            : "",
          prerequisites: String(data.prerequisites || ""),
          accessibility: String(data.accessibility || ""),
          cancellation_policy: String(data.cancellation_policy || ""),
        });
        setForm({
          title: String(data.title || ""),
          slug: String(data.slug || ""),
          category: String(data.category || "pottery"),
          short_description: String(data.short_description || ""),
          long_description: String(data.long_description || ""),
          duration_minutes: Number(data.duration_minutes || 180),
          price: 0,
          cover_image: String(data.cover_image || ""),
          instructor_name: String(data.instructor_name || ""),
          is_published: Boolean(data.is_published),
        });
      })
      .catch((error) => {
        if (active) setFormError(error.message || "Could not load workshop.");
      })
      .finally(() => {
        if (active) setEditLoading(false);
      });
    return () => {
      active = false;
    };
  }, [workshopId, isNew, user]);

  if (authLoading || dashboardState.loading || (user && editLoading))
    return <LoadingState />;
  if (dashboardState.error)
    return (
      <ErrorState
        message={dashboardState.error}
        onRetry={dashboardState.refresh}
      />
    );
  if (!user) {
    return (
      <div className="max-w-content mx-auto px-5 sm:px-8 py-24 text-center">
        <h1 className="text-headline text-ink mb-3">Sign in required</h1>
        <Link to="/login?from=/studio" className="btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  const studio = dashboardState.data;
  if (!studio) {
    return (
      <div className="max-w-content mx-auto px-5 sm:px-8 py-24 text-center">
        <EmptyState title="No studio" message="Create a studio first." />
        <Link to="/studio" className="btn-primary mt-4">
          Go to studio
        </Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.title.trim() || !form.slug.trim()) {
      setFormError("Title and slug are required.");
      return;
    }
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) ||
      !form.short_description.trim() ||
      !form.long_description.trim() ||
      form.duration_minutes < 1 ||
      form.duration_minutes > 10080
    ) {
      setFormError(
        "Add both descriptions, a valid URL slug, and a duration between 1 and 10,080 minutes.",
      );
      return;
    }
    setSubmitting(true);
    try {
      if (isNew) {
        await createWorkshop({
          ...details,
          learning_outcomes: details.learning_outcomes
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          materials: details.materials
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          studio_id: studio.studio_id,
          slug: form.slug,
          title: form.title,
          category: form.category,
          short_description: form.short_description || "Workshop",
          long_description: form.long_description || "Description coming soon.",
          duration_minutes: form.duration_minutes,
          price: 0,
          cover_image: form.cover_image || null,
          instructor_name: form.instructor_name || null,
          is_published: form.is_published,
        });
      } else if (workshopId) {
        await updateWorkshop(workshopId, {
          ...form,
          ...details,
          learning_outcomes: details.learning_outcomes
            .split("\n")
            .filter(Boolean),
          materials: details.materials.split("\n").filter(Boolean),
          price: 0,
          cover_image: form.cover_image || null,
          instructor_name: form.instructor_name || null,
        });
      }
      navigate("/studio");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save workshop.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-content mx-auto px-5 sm:px-8 py-8">
      <Link
        to="/studio"
        className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Studio dashboard
      </Link>
      <h1 className="text-headline text-ink mb-6">
        {isNew ? "New workshop" : "Edit workshop"}
      </h1>

      <div className="max-w-2xl space-y-5">
        <div>
          <label htmlFor="ws-title" className="field-label">
            Title
          </label>
          <input
            id="ws-title"
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="field-input"
            placeholder="e.g. Pottery Wheel Basics"
          />
        </div>
        <div>
          <label htmlFor="ws-slug" className="field-label">
            URL slug
          </label>
          <input
            id="ws-slug"
            type="text"
            value={form.slug}
            onChange={(e) =>
              setForm({
                ...form,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              })
            }
            className="field-input"
            placeholder="pottery-wheel-basics"
          />
          <p className="text-xs text-ink-faint mt-1">
            Published at /s/{studio.studio_slug}/{form.slug || "your-slug"}
          </p>
        </div>
        <div>
          <label htmlFor="ws-category" className="field-label">
            Category
          </label>
          <select
            id="ws-category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="field-input"
          >
            <option value="pottery">Pottery</option>
            <option value="photography">Photography</option>
            <option value="printmaking">Printmaking</option>
          </select>
        </div>
        <div>
          <label htmlFor="ws-short" className="field-label">
            Short description
          </label>
          <input
            id="ws-short"
            type="text"
            value={form.short_description}
            onChange={(e) =>
              setForm({ ...form, short_description: e.target.value })
            }
            className="field-input"
            placeholder="A one-line summary"
          />
        </div>
        <div>
          <label htmlFor="ws-long" className="field-label">
            Full description
          </label>
          <textarea
            id="ws-long"
            value={form.long_description}
            onChange={(e) =>
              setForm({ ...form, long_description: e.target.value })
            }
            className="field-input min-h-[120px]"
            placeholder="Detailed description of the workshop"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="ws-duration" className="field-label">
              Duration (minutes)
            </label>
            <input
              id="ws-duration"
              type="number"
              value={form.duration_minutes}
              onChange={(e) =>
                setForm({
                  ...form,
                  duration_minutes: parseInt(e.target.value) || 0,
                })
              }
              className="field-input"
              min={1}
            />
          </div>
          <div>
            <p className="field-label">Booking price</p>
            <p className="field-input">Free</p>
            <p className="text-xs text-ink-faint mt-1">
              This release manages free bookings. Payments are not collected.
            </p>
          </div>
        </div>
        <div>
          <label htmlFor="ws-cover" className="field-label">
            Cover image URL
          </label>
          <input
            id="ws-cover"
            type="url"
            value={form.cover_image}
            onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
            className="field-input"
            placeholder="https://..."
          />
        </div>
        <div>
          <label htmlFor="ws-instructor" className="field-label">
            Instructor name (optional)
          </label>
          <input
            id="ws-instructor"
            type="text"
            value={form.instructor_name}
            onChange={(e) =>
              setForm({ ...form, instructor_name: e.target.value })
            }
            className="field-input"
            placeholder="Defaults to studio instructor"
          />
        </div>
        <div>
          {(
            [
              "learning_outcomes",
              "materials",
              "prerequisites",
              "accessibility",
              "cancellation_policy",
            ] as const
          ).map((field) => (
            <div key={field} className="mb-5">
              <label htmlFor={`ws-${field}`} className="field-label">
                {field.replace(/_/g, " ")}
                {field === "materials" || field === "learning_outcomes"
                  ? " (one item per line)"
                  : ""}
              </label>
              <textarea
                id={`ws-${field}`}
                className="field-input min-h-[90px]"
                value={details[field]}
                onChange={(e) =>
                  setDetails({ ...details, [field]: e.target.value })
                }
              />
            </div>
          ))}
          <label className="field-label">Publication</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) =>
                setForm({ ...form, is_published: e.target.checked })
              }
              className="w-4 h-4 rounded border-ink/20"
            />
            <span className="text-sm text-ink-soft">
              Published (visible in public catalogue)
            </span>
          </label>
        </div>

        {formError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/studio" className="btn-secondary flex-1">
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex-1"
          >
            {submitting ? "Saving..." : "Save workshop"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudioWorkshopDetailPage() {
  const { workshopId } = useParams<{ workshopId: string }>();
  const { user, loading: authLoading } = useAuth();
  const dashboardState = useAsync<StudioDashboard | null>(
    fetchStudioDashboard,
    [user?.id],
  );
  const sessionsState = useAsync<StudioSession[]>(
    () => fetchStudioSessions(workshopId!),
    [workshopId, user?.id],
  );

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [rosterSession, setRosterSession] = useState<StudioSession | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Session form
  const [sessionForm, setSessionForm] = useState({
    format: "in-person",
    start_at: "",
    end_at: "",
    capacity: 8,
    location: "",
    timezone: "",
  });

  if (authLoading || dashboardState.loading) return <LoadingState />;
  if (!user) {
    return (
      <div className="max-w-content mx-auto px-5 sm:px-8 py-24 text-center">
        <h1 className="text-headline text-ink mb-3">Sign in required</h1>
        <Link to="/login?from=/studio" className="btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  const studio = dashboardState.data;
  if (!studio) {
    return (
      <div className="max-w-content mx-auto px-5 sm:px-8 py-24 text-center">
        <EmptyState title="No studio" message="Create a studio first." />
      </div>
    );
  }

  const sessions = sessionsState.data || [];

  const handleCreateSession = async () => {
    setActionError(null);
    setSubmitting(true);
    try {
      const start = new Date(sessionForm.start_at);
      const end = new Date(sessionForm.end_at);
      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        start.getTime() <= Date.now() ||
        end <= start ||
        sessionForm.capacity < 1 ||
        sessionForm.capacity > 1000 ||
        !sessionForm.location.trim()
      )
        throw new Error(
          "Choose a future start, a later end, a location, and capacity between 1 and 1,000.",
        );
      await createSession({
        workshop_id: workshopId!,
        format: sessionForm.format,
        start_at: new Date(sessionForm.start_at).toISOString(),
        end_at: new Date(sessionForm.end_at).toISOString(),
        capacity: sessionForm.capacity,
        location: sessionForm.location,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      setSessionModalOpen(false);
      setSessionForm({
        format: "in-person",
        start_at: "",
        end_at: "",
        capacity: 8,
        location: "",
        timezone: "",
      });
      sessionsState.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not create session.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-content mx-auto px-5 sm:px-8 py-8">
      <Link
        to="/studio"
        className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Studio dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-headline text-ink">Sessions</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Manage sessions, rosters, and check-in.
          </p>
        </div>
        <Link
          to={`/studio/workshops/${workshopId}/edit`}
          className="btn-secondary"
        >
          Edit workshop
        </Link>
        <button
          onClick={() => setSessionModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> New session
        </button>
      </div>

      {sessionsState.loading ? (
        <LoadingState label="Loading sessions..." />
      ) : sessionsState.error ? (
        <ErrorState
          message={sessionsState.error}
          onRetry={sessionsState.refresh}
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No sessions"
          message="Create a session to start accepting bookings."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-center flex-shrink-0 w-16">
                  <p className="text-sm font-display font-700 text-ink">
                    {formatTime(s.start_at)}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {formatDuration(
                      Math.round(
                        (new Date(s.end_at).getTime() -
                          new Date(s.start_at).getTime()) /
                          60000,
                      ),
                    )}
                  </p>
                </div>
                <div className="w-px h-12 bg-ink/10 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-ink">
                      {formatDate(s.start_at)}
                    </span>
                    {s.is_cancelled && (
                      <span className="chip bg-red-50 text-red-600">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {s.format === "online" ? "Online" : s.location}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-ink-faint" />
                    <span className="text-sm font-medium text-ink">
                      {s.booked_count}/{s.capacity}
                    </span>
                  </div>
                  {s.waitlist_count > 0 && (
                    <p className="text-xs text-plum-700 mt-0.5">
                      {s.waitlist_count} waiting
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setRosterSession(s)}
                  disabled={s.is_cancelled}
                  className="btn-secondary !py-2 text-xs disabled:opacity-40"
                >
                  Roster
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        title="New session"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="sess-format" className="field-label">
              Format
            </label>
            <select
              id="sess-format"
              value={sessionForm.format}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, format: e.target.value })
              }
              className="field-input"
            >
              <option value="in-person">In person</option>
              <option value="online">Online</option>
            </select>
          </div>
          <p className="text-xs text-ink-muted">
            Enter start and end in your device timezone:{" "}
            {Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}.
            Attendees see clearly labeled local times.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sess-start" className="field-label">
                Start
              </label>
              <input
                id="sess-start"
                type="datetime-local"
                value={sessionForm.start_at}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, start_at: e.target.value })
                }
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="sess-end" className="field-label">
                End
              </label>
              <input
                id="sess-end"
                type="datetime-local"
                value={sessionForm.end_at}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, end_at: e.target.value })
                }
                className="field-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sess-cap" className="field-label">
                Capacity
              </label>
              <input
                id="sess-cap"
                type="number"
                value={sessionForm.capacity}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    capacity: parseInt(e.target.value) || 1,
                  })
                }
                className="field-input"
                min={1}
              />
            </div>
          </div>
          <div>
            <label htmlFor="sess-loc" className="field-label">
              Location
            </label>
            <input
              id="sess-loc"
              type="text"
              value={sessionForm.location}
              onChange={(e) =>
                setSessionForm({ ...sessionForm, location: e.target.value })
              }
              className="field-input"
              placeholder={
                sessionForm.format === "online"
                  ? "Online via Zoom"
                  : "Studio address"
              }
            />
          </div>
          {actionError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setSessionModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSession}
              disabled={
                submitting || !sessionForm.start_at || !sessionForm.end_at
              }
              className="btn-primary flex-1"
            >
              {submitting ? "Creating..." : "Create session"}
            </button>
          </div>
        </div>
      </Modal>

      {rosterSession && (
        <RosterModal
          session={rosterSession}
          onClose={() => setRosterSession(null)}
          onRefresh={sessionsState.refresh}
        />
      )}
    </div>
  );
}

function RosterModal({
  session,
  onClose,
  onRefresh,
}: {
  session: StudioSession;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const rosterState = useAsync<RosterEntry[]>(
    () => fetchStudioRoster(session.id),
    [session.id],
  );
  const waitlistState = useAsync<WaitlistRosterEntry[]>(
    () => fetchStudioWaitlist(session.id),
    [session.id],
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const roster = rosterState.data || [];
  const [capacity, setCapacity] = useState(session.capacity);
  const [ticketSearch, setTicketSearch] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const waitlist = waitlistState.data || [];
  const activeRoster = roster.filter((r) => !r.cancelled_at);
  const shownRoster = activeRoster.filter((r) =>
    `${r.attendee_name} ${r.check_in_token}`
      .toLowerCase()
      .includes(ticketSearch.trim().toLowerCase()),
  );

  const handleCheckIn = async (bookingId: string, status: string) => {
    setActionError(null);
    setBusy(true);
    try {
      await checkIn(bookingId, status);
      rosterState.refresh();
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelSession = async () => {
    setActionError(null);
    try {
      await cancelSession(session.id);
      onClose();
      onRefresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not cancel session.",
      );
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Session roster"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-ink">
            {formatDate(session.start_at)}, {formatTime(session.start_at)}
          </p>
          <p className="text-xs text-ink-muted">
            {session.format === "online" ? "Online" : session.location}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Capacity
            </span>
            <span className="text-sm text-ink-soft">
              {activeRoster.length}/{session.capacity} booked
            </span>
          </div>
          <div className="h-2 rounded-full bg-paper-warm overflow-hidden">
            <div
              className="h-full bg-plum-600 transition-all rounded-full"
              style={{
                width: `${Math.min(100, (activeRoster.length / session.capacity) * 100)}%`,
              }}
            />
          </div>
          <div className="flex items-end gap-3 mt-3">
            <div className="flex-1">
              <label className="field-label" htmlFor="roster-capacity">
                Session capacity
              </label>
              <input
                id="roster-capacity"
                className="field-input"
                type="number"
                min={1}
                max={1000}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setActionError(null);
                try {
                  await updateSessionCapacity(session.id, capacity);
                  onRefresh();
                  waitlistState.refresh();
                } catch (error) {
                  setActionError(
                    error instanceof Error
                      ? error.message
                      : "Could not update capacity.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save capacity
            </button>
          </div>
        </div>

        {actionError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-ink-muted mb-3">
            Attendees
          </h4>
          <label htmlFor="ticket-search" className="field-label">
            Find by name or scanned ticket token
          </label>
          <input
            id="ticket-search"
            className="field-input mb-3"
            value={ticketSearch}
            onChange={(e) => setTicketSearch(e.target.value)}
            placeholder="Paste a QR token or enter a name"
          />
          {rosterState.error && (
            <ErrorState
              message={rosterState.error}
              onRetry={rosterState.refresh}
            />
          )}
          {rosterState.loading ? (
            <p className="text-sm text-ink-muted">Loading...</p>
          ) : activeRoster.length === 0 ? (
            <p className="text-sm text-ink-muted py-4 text-center">
              No bookings yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {shownRoster.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-ink/8 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {r.attendee_name}
                    </p>
                    <p className="text-xs text-ink-muted truncate font-mono">
                      Token: {r.check_in_token}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.check_in === "attended" ? (
                      <span className="chip bg-sage-50 text-sage-600">
                        <Check className="w-3 h-3" /> In
                      </span>
                    ) : r.check_in === "no-show" ? (
                      <span className="chip bg-red-50 text-red-600">
                        <X className="w-3 h-3" /> No-show
                      </span>
                    ) : (
                      <span className="chip bg-paper-warm text-ink-muted">
                        Registered
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {r.check_in !== "attended" && (
                      <button
                        disabled={busy}
                        onClick={() => handleCheckIn(r.id, "attended")}
                        className="p-1.5 rounded-full hover:bg-sage-50 transition-colors"
                        aria-label="Check in"
                      >
                        <UserCheck className="w-4 h-4 text-sage-600" />
                      </button>
                    )}
                    {r.check_in !== "no-show" && (
                      <button
                        onClick={() => handleCheckIn(r.id, "no-show")}
                        className="p-1.5 rounded-full hover:bg-red-50 transition-colors"
                        aria-label="Mark no-show"
                      >
                        <UserX className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {waitlist.length > 0 && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-ink-muted mb-3">
              Waitlist ({waitlist.length})
            </h4>
            <div className="space-y-2">
              {waitlist.map((w, i) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 rounded-lg border border-ink/8 p-3"
                >
                  <span className="text-xs font-display font-700 text-ink-faint w-5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {w.attendee_name}
                    </p>
                  </div>
                  {w.status === "offered" ? (
                    <span className="chip bg-plum-50 text-plum-700">
                      Offered
                    </span>
                  ) : (
                    <span className="chip bg-paper-warm text-ink-muted">
                      Waiting
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!session.is_cancelled && (
          <button
            onClick={() =>
              confirmCancel ? handleCancelSession() : setConfirmCancel(true)
            }
            className="btn-secondary w-full text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            {confirmCancel
              ? "Confirm cancellation of session and all bookings"
              : "Cancel this session"}
          </button>
        )}
      </div>
    </Modal>
  );
}
