import { Link } from "react-router-dom";
import { BrandMark } from "./BrandMark";

export function Footer() {
  return (
    <footer className="mt-24 hairline">
      <div className="max-w-content mx-auto px-5 sm:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 text-ink mb-3">
              <BrandMark className="w-6 h-6" />
              <span className="font-display text-base font-700 tracking-tight">
                Seatloom
              </span>
            </Link>
            <p className="text-sm text-ink-muted max-w-xs">
              Make room for something new. Creative workshops at Common Ground
              Studio.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint mb-3">
              Product
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  Workshop catalogue
                </Link>
              </li>
              <li>
                <Link
                  to="/demo/organizer"
                  className="text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  Organizer demo
                </Link>
              </li>
              <li>
                <Link
                  to="/my-bookings"
                  className="text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  My bookings
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  Create account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint mb-3">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  Terms of service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint mb-3">
              Studio
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/studio"
                  className="text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  Studio dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-sm text-ink-soft hover:text-ink transition-colors"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 hairline flex flex-col sm:flex-row justify-between gap-3">
          <p className="text-xs text-ink-faint">
            Seatloom is a product by Noerong. Common Ground Studio is a
            fictional studio for demonstration.
          </p>
          <p className="text-xs text-ink-faint">
            &copy; {new Date().getFullYear()} Noerong. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
