import type {
  DemoState,
  Booking,
  WaitlistEntry,
  ActivityEntry,
  Session,
  BookingStatus,
  CheckInStatus,
  WaitlistStatus,
} from './types';
import { OFFER_DURATION_MS } from './types';

export type DemoAction =
  | { type: 'BOOK'; sessionId: string; workshopId: string; attendeeName: string; attendeeEmail: string }
  | { type: 'CANCEL'; bookingId: string }
  | { type: 'RESCHEDULE'; bookingId: string; newSessionId: string }
  | { type: 'JOIN_WAITLIST'; sessionId: string; workshopId: string; attendeeName: string; attendeeEmail: string }
  | { type: 'ACCEPT_OFFER'; waitlistId: string }
  | { type: 'EXPIRE_OFFERS' }
  | { type: 'CHECK_IN'; bookingId: string; status: CheckInStatus }
  | { type: 'RESET' }
  | { type: 'LOAD'; state: DemoState };

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function activity(type: ActivityEntry['type'], message: string): ActivityEntry {
  return { id: genId('act'), type, message, timestamp: now() };
}

export function getBookedCount(state: DemoState, sessionId: string): number {
  return state.bookings.filter((b) => b.sessionId === sessionId && b.status === 'confirmed').length;
}

export function getSessionStatus(state: DemoState, session: Session): 'open' | 'full' | 'waitlist' {
  const count = getBookedCount(state, session.id);
  if (count >= session.capacity) return 'full';
  return 'open';
}

export function getAvailableSeats(state: DemoState, sessionId: string): number {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return 0;
  return Math.max(0, session.capacity - getBookedCount(state, sessionId));
}

export function getActiveWaitlist(state: DemoState, sessionId: string): WaitlistEntry[] {
  return state.waitlist
    .filter((w) => w.sessionId === sessionId && (w.status === 'waiting' || w.status === 'offered'))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateName(name: string): boolean {
  return name.trim().length >= 2;
}

export function validateAttendee(name: string, email: string): { name?: string; email?: string } {
  const errors: { name?: string; email?: string } = {};
  if (!validateName(name)) errors.name = 'Please enter your full name (at least 2 characters).';
  if (!validateEmail(email)) errors.email = 'Please enter a valid email address.';
  return errors;
}

function offerNextWaiter(state: DemoState, sessionId: string): { state: DemoState; offered?: WaitlistEntry } {
  const waiters = getActiveWaitlist(state, sessionId);
  const firstWaiting = waiters.find((w) => w.status === 'waiting');
  if (!firstWaiting) return { state };

  const expiresAt = new Date(Date.now() + OFFER_DURATION_MS).toISOString();
  const updatedEntry: WaitlistEntry = {
    ...firstWaiting,
    status: 'offered',
    offeredAt: now(),
    expiresAt,
  };

  return {
    state: {
      ...state,
      waitlist: state.waitlist.map((w) => (w.id === firstWaiting.id ? updatedEntry : w)),
      activity: [activity('waitlist_offer', `Seat offered to ${updatedEntry.attendeeName}`), ...state.activity],
    },
    offered: updatedEntry,
  };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'LOAD':
      return action.state;

    case 'RESET':
      return state;

    case 'BOOK': {
      const errors = validateAttendee(action.attendeeName, action.attendeeEmail);
      if (Object.keys(errors).length > 0) return state;

      const session = state.sessions.find((s) => s.id === action.sessionId);
      if (!session) return state;

      const available = getAvailableSeats(state, action.sessionId);
      if (available <= 0) return state;

      const booking: Booking = {
        id: genId('bk'),
        sessionId: action.sessionId,
        workshopId: action.workshopId,
        attendeeName: action.attendeeName.trim(),
        attendeeEmail: action.attendeeEmail.trim(),
        status: 'confirmed',
        createdAt: now(),
        checkIn: 'registered',
      };

      return {
        ...state,
        bookings: [...state.bookings, booking],
        activity: [activity('booking', `${booking.attendeeName} booked a seat`), ...state.activity],
      };
    }

    case 'CANCEL': {
      const booking = state.bookings.find((b) => b.id === action.bookingId);
      if (!booking || booking.status === 'cancelled') return state;

      const updatedBookings = state.bookings.map((b) =>
        b.id === action.bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b
      );

      let newState: DemoState = {
        ...state,
        bookings: updatedBookings,
        activity: [activity('cancellation', `${booking.attendeeName} cancelled their booking`), ...state.activity],
      };

      // Offer freed seat to first waitlisted person
      const result = offerNextWaiter(newState, booking.sessionId);
      return result.state;
    }

    case 'RESCHEDULE': {
      const booking = state.bookings.find((b) => b.id === action.bookingId);
      if (!booking || booking.status === 'cancelled') return state;

      const newSession = state.sessions.find((s) => s.id === action.newSessionId);
      if (!newSession) return state;

      const available = getAvailableSeats(state, action.newSessionId);
      // The reschedule frees the old seat, so we check if there's room (accounting for the freed old seat)
      const oldSessionFreesSeat = booking.sessionId !== action.newSessionId;
      if (available <= 0 && !oldSessionFreesSeat) return state;
      if (available <= 0 && oldSessionFreesSeat && available < 0) return state;

      const updatedBookings = state.bookings.map((b) =>
        b.id === action.bookingId
          ? { ...b, sessionId: action.newSessionId, status: 'rescheduled' as BookingStatus }
          : b
      );

      let newState: DemoState = {
        ...state,
        bookings: updatedBookings,
        activity: [
          activity('reschedule', `${booking.attendeeName} rescheduled to a new session`),
          ...state.activity,
        ],
      };

      // Offer freed seat to first waitlisted person on old session
      if (oldSessionFreesSeat) {
        const result = offerNextWaiter(newState, booking.sessionId);
        newState = result.state;
      }

      return newState;
    }

    case 'JOIN_WAITLIST': {
      const errors = validateAttendee(action.attendeeName, action.attendeeEmail);
      if (Object.keys(errors).length > 0) return state;

      const session = state.sessions.find((s) => s.id === action.sessionId);
      if (!session) return state;

      // Can only join waitlist if session is full
      if (getAvailableSeats(state, action.sessionId) > 0) return state;

      const entry: WaitlistEntry = {
        id: genId('wl'),
        sessionId: action.sessionId,
        workshopId: action.workshopId,
        attendeeName: action.attendeeName.trim(),
        attendeeEmail: action.attendeeEmail.trim(),
        status: 'waiting',
        offeredAt: null,
        expiresAt: null,
        createdAt: now(),
      };

      return {
        ...state,
        waitlist: [...state.waitlist, entry],
        activity: [activity('waitlist_join', `${entry.attendeeName} joined the waitlist`), ...state.activity],
      };
    }

    case 'ACCEPT_OFFER': {
      const entry = state.waitlist.find((w) => w.id === action.waitlistId);
      if (!entry || entry.status !== 'offered') return state;

      const available = getAvailableSeats(state, entry.sessionId);
      if (available <= 0) return state;

      const booking: Booking = {
        id: genId('bk'),
        sessionId: entry.sessionId,
        workshopId: entry.workshopId,
        attendeeName: entry.attendeeName,
        attendeeEmail: entry.attendeeEmail,
        status: 'confirmed',
        createdAt: now(),
        checkIn: 'registered',
      };

      const updatedWaitlist = state.waitlist.map((w) =>
        w.id === action.waitlistId ? { ...w, status: 'booked' as WaitlistStatus } : w
      );

      return {
        ...state,
        bookings: [...state.bookings, booking],
        waitlist: updatedWaitlist,
        activity: [
          activity('waitlist_booked', `${entry.attendeeName} accepted offer and booked`),
          ...state.activity,
        ],
      };
    }

    case 'EXPIRE_OFFERS': {
      const nowMs = Date.now();
      let changed = false;

      const updatedWaitlist = state.waitlist.map((w) => {
        if (w.status === 'offered' && w.expiresAt && new Date(w.expiresAt).getTime() < nowMs) {
          changed = true;
          return { ...w, status: 'expired' as WaitlistStatus };
        }
        return w;
      });

      if (!changed) return state;

      let newState: DemoState = {
        ...state,
        waitlist: updatedWaitlist,
        activity: [activity('waitlist_expire', 'A waitlist offer expired'), ...state.activity],
      };

      // Find sessions that had expired offers and offer to next waiter
      const expiredEntries = state.waitlist.filter(
        (w) => w.status === 'offered' && w.expiresAt && new Date(w.expiresAt).getTime() < nowMs
      );

      for (const expired of expiredEntries) {
        const result = offerNextWaiter(newState, expired.sessionId);
        newState = result.state;
      }

      return newState;
    }

    case 'CHECK_IN': {
      const booking = state.bookings.find((b) => b.id === action.bookingId);
      if (!booking) return state;

      const updatedBookings = state.bookings.map((b) =>
        b.id === action.bookingId ? { ...b, checkIn: action.status } : b
      );

      const label = action.status === 'attended' ? 'checked in' : 'marked no-show';
      return {
        ...state,
        bookings: updatedBookings,
        activity: [activity('check_in', `${booking.attendeeName} ${label}`), ...state.activity],
      };
    }

    default:
      return state;
  }
}
