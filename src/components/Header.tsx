import { useAuth } from "@/lib/auth";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BrandMark } from "./BrandMark";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? "text-ink" : "text-ink-soft hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md hairline-b">
      <div className="max-w-content mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 text-ink">
            <BrandMark className="w-7 h-7" />
            <span className="font-display text-lg font-700 tracking-tight">
              Seatloom
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/" end className={navLinkClass}>
              Workshops
            </NavLink>
            <NavLink to="/demo/organizer" className={navLinkClass}>
              Organizer demo
            </NavLink>
            {user ? (
              <>
                <NavLink to="/my-bookings" className={navLinkClass}>
                  My bookings
                </NavLink>
                <NavLink to="/studio" className={navLinkClass}>
                  Studio
                </NavLink>
                <button
                  onClick={() => signOut()}
                  className="text-sm font-medium text-ink-soft hover:text-ink transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Sign in
                </NavLink>
                <Link to="/signup" className="btn-primary !py-2 !px-4 text-sm">
                  Get started
                </Link>
              </>
            )}
          </nav>

          <button
            className="md:hidden p-2 -mr-2 text-ink"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-ink/10 bg-paper-card animate-slide-up">
          <div className="px-5 py-4 space-y-3">
            <NavLink
              to="/"
              end
              className="block py-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Workshops
            </NavLink>
            <NavLink
              to="/demo/organizer"
              className="block py-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Organizer demo
            </NavLink>
            {user ? (
              <>
                <NavLink
                  to="/my-bookings"
                  className="block py-2 text-sm font-medium text-ink-soft hover:text-ink"
                >
                  My bookings
                </NavLink>
                <NavLink
                  to="/studio"
                  className="block py-2 text-sm font-medium text-ink-soft hover:text-ink"
                >
                  Studio
                </NavLink>
                <button
                  onClick={() => signOut()}
                  className="block py-2 text-sm font-medium text-ink-soft hover:text-ink"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="block py-2 text-sm font-medium text-ink-soft hover:text-ink"
                >
                  Sign in
                </NavLink>
                <Link to="/signup" className="btn-primary w-full">
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
