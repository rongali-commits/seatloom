import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { BrandMark } from '@/components/BrandMark';
import { Plus, Calendar, Users, Settings, ArrowRight } from 'lucide-react';

export function StudioPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-sm text-ink-muted">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-5 py-12">
        <div className="text-center max-w-sm">
          <BrandMark className="w-10 h-10 text-ink mx-auto mb-4" />
          <h1 className="text-headline text-ink mb-3">Studio access</h1>
          <p className="text-sm text-ink-muted mb-6">
            Sign in to access your studio dashboard and manage workshops.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/login" className="btn-primary">
              Sign in
            </Link>
            <Link to="/signup" className="btn-secondary">
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto px-5 sm:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-headline text-ink">Studio dashboard</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Signed in as {user.email}
        </p>
      </div>

      {/* Empty state */}
      <div className="rounded-2xl border-2 border-dashed border-ink/10 p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-paper-warm flex items-center justify-center mx-auto mb-4">
          <Plus className="w-7 h-7 text-ink-faint" />
        </div>
        <h2 className="text-title text-ink mb-2">Set up your studio</h2>
        <p className="text-sm text-ink-muted max-w-md mx-auto mb-6">
          You don't have a studio yet. Create one to start adding workshops, scheduling
          sessions, and accepting bookings. This will be available in the next phase.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button disabled className="btn-primary opacity-40 pointer-events-none">
            <Plus className="w-4 h-4" />
            Create studio
          </button>
          <Link to="/" className="btn-secondary">
            Browse workshops
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Feature preview cards */}
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <div className="card p-5">
          <Calendar className="w-5 h-5 text-plum-600 mb-3" />
          <h3 className="text-sm font-medium text-ink mb-1">Session scheduling</h3>
          <p className="text-xs text-ink-muted">
            Create and manage sessions with capacity tracking.
          </p>
        </div>
        <div className="card p-5">
          <Users className="w-5 h-5 text-plum-600 mb-3" />
          <h3 className="text-sm font-medium text-ink mb-1">Attendee management</h3>
          <p className="text-xs text-ink-muted">
            View rosters, check in attendees, and manage waitlists.
          </p>
        </div>
        <div className="card p-5">
          <Settings className="w-5 h-5 text-plum-600 mb-3" />
          <h3 className="text-sm font-medium text-ink mb-1">Studio settings</h3>
          <p className="text-xs text-ink-muted">
            Configure your studio profile and booking policies.
          </p>
        </div>
      </div>
    </div>
  );
}
