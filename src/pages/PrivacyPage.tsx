export function PrivacyPage() {
  return (
    <div className="max-w-prose-narrow mx-auto px-5 sm:px-8 py-12">
      <h1 className="text-headline text-ink mb-6">Privacy policy</h1>
      <div className="space-y-4 text-sm text-ink-soft leading-relaxed">
        <p>
          Seatloom is a product by Noerong. This page describes how Seatloom handles your data
          as of September 2026. This is a product-specific summary, not legal advice.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">What we collect</h2>
        <p>
          When you create an account, we store your email address and a hashed password.
          When you book a workshop, we store your name and email so the studio organizer can
          manage their roster. We do not collect payment card information in this phase.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">How we use it</h2>
        <p>
          Your email is used to send you booking confirmations and allow you to sign in.
          Studio organizers can see your name and email for sessions you have booked.
          Other attendees cannot see your personal details.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">Email delivery</h2>
        <p>
          Booking confirmations are written to an outbox table. Email delivery is not currently
          configured, so no emails are sent. Your in-app booking status is authoritative.
          When email delivery is configured, queued messages will be sent.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">Data retention</h2>
        <p>
          Your bookings and waitlist entries remain until you cancel them or the session passes.
          Cancelled bookings are retained for record-keeping. You can request deletion of your
          account and associated data by contacting Noerong.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">Demo data</h2>
        <p>
          The interactive demo on the home page uses data stored only in your browser. No demo
          bookings are sent to our servers. Clearing your browser storage removes all demo data.
        </p>
      </div>
    </div>
  );
}
