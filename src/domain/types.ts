export type WorkshopCategory = "pottery" | "photography" | "printmaking";

export type SessionFormat = "in-person" | "online";

export type SessionStatus = "open" | "full" | "waitlist";

export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";

export type WaitlistStatus = "waiting" | "offered" | "expired" | "booked";

export type CheckInStatus = "registered" | "attended" | "no-show";

export interface Instructor {
  id: string;
  name: string;
  bio: string;
  photoUrl: string;
}

export interface Workshop {
  id: string;
  slug: string;
  title: string;
  category: WorkshopCategory;
  instructorId: string;
  shortDescription: string;
  longDescription: string;
  learningOutcomes: string[];
  materials: string[];
  prerequisites: string;
  accessibility: string;
  cancellationPolicy: string;
  durationMinutes: number;
  price: number;
  coverImage: string;
  gallery: string[];
  formats: SessionFormat[];
}

export interface Session {
  id: string;
  workshopId: string;
  format: SessionFormat;
  startAt: string;
  endAt: string;
  capacity: number;
  location: string;
  timezone?: string;
}

export interface Booking {
  id: string;
  sessionId: string;
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
  status: BookingStatus;
  createdAt: string;
  checkIn: CheckInStatus;
}

export interface WaitlistEntry {
  id: string;
  sessionId: string;
  workshopId: string;
  attendeeName: string;
  attendeeEmail: string;
  status: WaitlistStatus;
  offeredAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  type:
    | "booking"
    | "cancellation"
    | "reschedule"
    | "waitlist_join"
    | "waitlist_offer"
    | "waitlist_expire"
    | "waitlist_booked"
    | "check_in";
  message: string;
  timestamp: string;
}

export interface DemoState {
  sessions: Session[];
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  activity: ActivityEntry[];
}

export const OFFER_DURATION_MS = 15 * 60 * 1000;
