import { ImageWithFallback } from "@/components/ImageWithFallback";
import { getAvailableSeats, getSessionStatus } from "@/domain/reducer";
import {
  categoryColors,
  categoryLabels,
  instructors,
  workshops,
} from "@/domain/seed";
import type { WorkshopCategory } from "@/domain/types";
import { useDemo } from "@/lib/demo-context";
import { formatDate, formatDuration } from "@/lib/format";
import { ArrowRight, Calendar, Clock, MapPin, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Filter = "all" | WorkshopCategory;

export function HomePage() {
  const { state } = useDemo();
  const [filter, setFilter] = useState<Filter>("all");

  const filteredWorkshops = useMemo(() => {
    if (filter === "all") return workshops;
    return workshops.filter((w) => w.category === filter);
  }, [filter]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All workshops" },
    { value: "pottery", label: "Pottery" },
    { value: "photography", label: "Photography" },
    { value: "printmaking", label: "Printmaking" },
  ];

  const heroImage = "/assets/pottery-hero.webp";

  return (
    <div>
      {/* Hero */}
      <section className="relative">
        <div className="max-w-content mx-auto px-5 sm:px-8 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-end">
            <div className="md:col-span-7 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-plum-50 px-3 py-1 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-plum-500 animate-pulse" />
                <span className="text-xs font-medium text-plum-700">
                  Interactive demo
                </span>
              </div>
              <h1 className="text-display text-ink text-balance">
                Make room for something new.
              </h1>
              <p className="mt-5 text-lg text-ink-soft text-pretty max-w-prose-narrow">
                Hands-on creative workshops at Common Ground Studio. Pottery,
                photography, and printmaking in small, focused groups. Explore
                this fictional studio, then create your own.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#workshops" className="btn-primary">
                  Browse workshops
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link to="/demo/organizer" className="btn-secondary">
                  Organizer demo
                </Link>
              </div>
            </div>
            <div className="md:col-span-5 lg:col-span-6">
              <div className="relative aspect-[4/3] md:aspect-[5/4] rounded-2xl overflow-hidden bg-paper-warm">
                <ImageWithFallback
                  src={heroImage}
                  alt="Hands shaping clay on a pottery wheel"
                  className="w-full h-full object-cover"
                  fallbackText="Pottery workshop photograph"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workshop catalogue */}
      <section
        id="workshops"
        className="max-w-content mx-auto px-5 sm:px-8 pb-16"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-headline text-ink">Upcoming workshops</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Three workshops, running this season. All sessions are free for
              this demo.
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter workshops by category"
          >
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`chip ${filter === f.value ? "chip-active" : "chip-inactive"}`}
                aria-pressed={filter === f.value}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredWorkshops.length === 0 ? (
          <div className="text-center py-16 text-ink-muted">
            <p>No workshops in this category right now.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkshops.map((workshop) => {
              const instructor = instructors.find(
                (i) => i.id === workshop.instructorId,
              );
              const workshopSessions = state.sessions.filter(
                (s) => s.workshopId === workshop.id,
              );
              const nextSession = workshopSessions
                .filter((s) => new Date(s.startAt).getTime() > Date.now())
                .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];

              if (!nextSession) return null;

              const seats = getAvailableSeats(state, nextSession.id);
              const status = getSessionStatus(state, nextSession);

              return (
                <Link
                  key={workshop.id}
                  to={`/workshops/${workshop.slug}`}
                  className="card group hover:shadow-lg hover:border-ink/15 transition-all duration-300 overflow-hidden"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-paper-warm">
                    <ImageWithFallback
                      src={workshop.coverImage}
                      alt={workshop.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      fallbackText="Workshop photograph"
                    />
                    <div className="absolute top-3 left-3">
                      <span
                        className={`chip ${categoryColors[workshop.category]}`}
                      >
                        {categoryLabels[workshop.category]}
                      </span>
                    </div>
                    {status === "full" && (
                      <div className="absolute top-3 right-3">
                        <span className="chip bg-ink/80 text-paper">
                          Waitlist
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-title text-ink mb-1">
                      {workshop.title}
                    </h3>
                    <p className="text-sm text-ink-muted mb-4 line-clamp-2">
                      {workshop.shortDescription}
                    </p>
                    <div className="space-y-2 text-sm text-ink-soft">
                      <div className="flex items-center gap-2">
                        <span className="text-ink-faint">with</span>
                        <span className="font-medium text-ink">
                          {instructor?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-ink-faint" />
                          {formatDuration(workshop.durationMinutes)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-ink-faint" />
                          {formatDate(nextSession.startAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-ink-faint" />
                          {nextSession.format === "online"
                            ? "Online"
                            : "Bristol"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-ink-faint" />
                          {status === "full" ? (
                            <span className="text-plum-700 font-medium">
                              Waitlist
                            </span>
                          ) : seats === 1 ? (
                            <span className="text-gold-600 font-medium">
                              1 seat left
                            </span>
                          ) : (
                            <span>{seats} seats</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
