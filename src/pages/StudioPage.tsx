import { BrandMark } from "@/components/BrandMark";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/LoadingState";
import { Modal } from "@/components/Modal";
import {
  createStudio,
  fetchStudioDashboard,
  fetchStudioWorkshops,
  type StudioDashboard,
  type StudioWorkshop,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDuration, formatPrice } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { AlertCircle, ArrowRight, Calendar, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function StudioPage() {
  const { user, loading: authLoading } = useAuth();
  const dashboardState = useAsync<StudioDashboard | null>(
    fetchStudioDashboard,
    [user?.id],
  );
  const workshopsState = useAsync<StudioWorkshop[]>(fetchStudioWorkshops, [
    user?.id,
  ]);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupName, setSetupName] = useState("");
  const [setupSlug, setSetupSlug] = useState("");
  const [setupBio, setSetupBio] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (authLoading || dashboardState.loading) return <LoadingState />;

  if (!user) {
    return (
      <div className="max-w-content mx-auto px-5 sm:px-8 py-24 text-center">
        <BrandMark className="w-10 h-10 text-ink mx-auto mb-4" />
        <h1 className="text-headline text-ink mb-3">Studio access</h1>
        <p className="text-sm text-ink-muted mb-6">
          Sign in to access your studio dashboard.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/login?from=/studio" className="btn-primary">
            Sign in
          </Link>
          <Link to="/signup?from=/studio" className="btn-secondary">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const studio = dashboardState.data;
  if (dashboardState.error)
    return (
      <ErrorState
        message={dashboardState.error}
        onRetry={dashboardState.refresh}
      />
    );

  if (!studio) {
    return (
      <div className="max-w-content mx-auto px-5 sm:px-8 py-8">
        <h1 className="text-headline text-ink mb-2">Studio dashboard</h1>
        <p className="text-sm text-ink-muted mb-8">Signed in as {user.email}</p>
        <div className="rounded-2xl border-2 border-dashed border-ink/10 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-paper-warm flex items-center justify-center mx-auto mb-4">
            <Plus className="w-7 h-7 text-ink-faint" />
          </div>
          <h2 className="text-title text-ink mb-2">Set up your studio</h2>
          <p className="text-sm text-ink-muted max-w-md mx-auto mb-6">
            Create a studio to start adding workshops, scheduling sessions, and
            accepting bookings.
          </p>
          <button
            onClick={() => setSetupModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create studio
          </button>
        </div>
        <Modal
          open={setupModalOpen}
          onClose={() => setSetupModalOpen(false)}
          title="Create your studio"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="studio-name" className="field-label">
                Studio name
              </label>
              <input
                id="studio-name"
                type="text"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="field-input"
                placeholder="e.g. Common Ground Studio"
                required
              />
            </div>
            <div>
              <label htmlFor="studio-slug" className="field-label">
                URL slug
              </label>
              <input
                id="studio-slug"
                type="text"
                value={setupSlug}
                onChange={(e) =>
                  setSetupSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  )
                }
                className="field-input"
                placeholder="e.g. common-ground-studio"
                required
              />
              <p className="text-xs text-ink-faint mt-1">
                Your catalogue will be at /s/{setupSlug || "your-slug"}
              </p>
            </div>
            <div>
              <label htmlFor="studio-bio" className="field-label">
                Bio (optional)
              </label>
              <textarea
                id="studio-bio"
                value={setupBio}
                onChange={(e) => setSetupBio(e.target.value)}
                className="field-input min-h-[80px]"
                placeholder="A short description of your studio"
              />
            </div>
            {setupError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{setupError}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setSetupModalOpen(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSubmitting(true);
                  setSetupError(null);
                  try {
                    await createStudio(setupName, setupSlug, setupBio);
                    setSetupModalOpen(false);
                    dashboardState.refresh();
                    workshopsState.refresh();
                  } catch (err) {
                    setSetupError(
                      err instanceof Error
                        ? err.message
                        : "Could not create studio.",
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting || !setupName || !setupSlug}
                className="btn-primary flex-1"
              >
                {submitting ? "Creating..." : "Create studio"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  const workshops = workshopsState.data || [];

  return (
    <div className="max-w-content mx-auto px-5 sm:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-headline text-ink">{studio.studio_name}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Signed in as {user.email}
          </p>
          <Link
            to={`/s/${studio.studio_slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-plum-700 hover:text-plum-800 mt-2"
          >
            View public catalogue <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <Link to="/studio/workshops/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New workshop
        </Link>
      </div>

      {workshopsState.loading ? (
        <LoadingState label="Loading workshops..." />
      ) : workshopsState.error ? (
        <ErrorState
          message={workshopsState.error}
          onRetry={workshopsState.refresh}
        />
      ) : workshops.length === 0 ? (
        <EmptyState
          title="No workshops yet"
          message="Create your first workshop to start accepting bookings."
        />
      ) : (
        <div className="space-y-4">
          {workshops.map((w) => (
            <Link
              key={w.id}
              to={`/studio/workshops/${w.id}`}
              className="card p-5 hover:border-ink/15 transition-all flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-title text-ink">{w.title}</h3>
                  {w.is_published ? (
                    <span className="chip bg-sage-50 text-sage-600">
                      Published
                    </span>
                  ) : (
                    <span className="chip bg-paper-warm text-ink-muted">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-muted mt-1">
                  {w.short_description}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-ink-faint">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {w.session_count} sessions
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {formatDuration(w.duration_minutes)}
                  </span>
                  <span>{formatPrice(w.price)}</span>
                  {w.next_session_at && (
                    <span>Next: {formatDate(w.next_session_at)}</span>
                  )}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-ink-faint flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
