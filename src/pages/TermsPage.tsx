export function TermsPage() {
  return (
    <div className="max-w-prose-narrow mx-auto px-5 sm:px-8 py-12">
      <h1 className="text-headline text-ink mb-6">Terms of service</h1>
      <div className="space-y-4 text-sm text-ink-soft leading-relaxed">
        <p>
          Seatloom is a product by Noerong. These terms describe the agreement
          between you and Noerong when you use Seatloom. This is a
          product-specific summary, not legal advice.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">Booking workshops</h2>
        <p>
          When you book a workshop, you reserve a seat for a specific session.
          You can cancel or reschedule your booking through your account before
          the session starts, subject to availability. This release supports
          free reservations only and does not collect payments.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">Waitlist</h2>
        <p>
          If a session is full, you can join a waitlist. When a seat opens, the
          first person on the waitlist receives an offer that is valid for 15
          minutes. If the offer expires, the seat is offered to the next person
          in line when availability is next refreshed or a booking action
          occurs. Check My bookings for offers. No background booking-email
          delivery is enabled.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">Check-in</h2>
        <p>
          Each booking includes a check-in token. Studio organizers use this
          token to verify your attendance. The token is a lookup identifier only
          and is not a security credential.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">Demo</h2>
        <p>
          The interactive demo on the home page is fictional. Demo bookings are
          stored in your browser only and are not real reservations. No real
          workshops are booked through the demo.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">Email</h2>
        <p>
          Email delivery is not currently configured. Booking confirmations are
          queued but not sent. Your in-app booking status is the authoritative
          record of your reservation.
        </p>
        <h2 className="text-title text-ink mt-6 mb-2">Liability</h2>
        <p>
          Seatloom is provided as is. Noerong is not responsible for workshop
          content, quality, or outcomes. Studios are responsible for their own
          sessions, cancellations, and attendee communication.
        </p>
      </div>
    </div>
  );
}
