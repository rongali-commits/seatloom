import { ImageWithFallback } from "@/components/ImageWithFallback";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/LoadingState";
import type { PublicStudio, PublicStudioWorkshop } from "@/lib/api";
import { fetchPublicStudio, fetchPublicStudioWorkshops } from "@/lib/api";
import { formatDate, formatDuration, formatPrice } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export function PublicStudioPage() {
  const { studioSlug } = useParams<{ studioSlug: string }>();

  const studioState = useAsync<PublicStudio | null>(
    () => fetchPublicStudio(studioSlug!),
    [studioSlug],
  );
  const workshopsState = useAsync<PublicStudioWorkshop[]>(
    () => fetchPublicStudioWorkshops(studioSlug!),
    [studioSlug],
  );

  if (studioState.loading) return <LoadingState label="Loading studio..." />;
  if (studioState.error)
    return (
      <ErrorState message={studioState.error} onRetry={studioState.refresh} />
    );
  if (!studioState.data)
    return (
      <EmptyState
        title="Studio not found"
        message="This studio may not exist or has no published workshops."
      />
    );

  const studio = studioState.data;

  return (
    <div>
      <section className="max-w-content mx-auto px-5 sm:px-8 pt-12 pb-8">
        <div className="flex items-center gap-2 text-sm text-ink-muted mb-4">
          <MapPin className="w-4 h-4" />
          <span>{studio.name}</span>
        </div>
        <h1 className="text-display text-ink text-balance mb-4">
          {studio.name}
        </h1>
        {studio.bio && (
          <p className="text-lg text-ink-soft text-pretty max-w-prose-narrow">
            {studio.bio}
          </p>
        )}
      </section>

      <section className="max-w-content mx-auto px-5 sm:px-8 pb-16">
        <h2 className="text-headline text-ink mb-6">Workshops</h2>
        {workshopsState.loading ? (
          <LoadingState label="Loading workshops..." />
        ) : workshopsState.error ? (
          <ErrorState
            message={workshopsState.error}
            onRetry={workshopsState.refresh}
          />
        ) : !workshopsState.data || workshopsState.data.length === 0 ? (
          <EmptyState
            title="No workshops available"
            message="This studio has not published any workshops yet."
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshopsState.data.map((w) => (
              <Link
                key={w.id}
                to={`/s/${studio.slug}/${w.slug}`}
                className="card group hover:shadow-lg hover:border-ink/15 transition-all duration-300 overflow-hidden"
              >
                {w.cover_image && (
                  <div className="relative aspect-[4/3] overflow-hidden bg-paper-warm">
                    <ImageWithFallback
                      src={w.cover_image}
                      alt={w.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      fallbackText="Workshop photograph"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-title text-ink mb-1">{w.title}</h3>
                  <p className="text-sm text-ink-muted mb-4 line-clamp-2">
                    {w.short_description}
                  </p>
                  <div className="space-y-2 text-sm text-ink-soft">
                    {w.instructor_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-ink-faint">with</span>
                        <span className="font-medium text-ink">
                          {w.instructor_name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-ink-faint" />
                        {formatDuration(w.duration_minutes)}
                      </span>
                      {w.next_session_at && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-ink-faint" />
                          {formatDate(w.next_session_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-plum-700 font-medium">
                        {formatPrice(w.price)}
                      </span>
                      {w.available_seats != null && w.available_seats > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-ink-faint" />
                          {w.available_seats} seats
                        </span>
                      ) : w.available_seats === 0 ? (
                        <span className="text-plum-700 font-medium">
                          Waitlist
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
