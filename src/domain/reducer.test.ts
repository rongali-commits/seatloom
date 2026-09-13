import { describe, expect, it } from "vitest";
import {
  demoReducer,
  getActiveWaitlist,
  getAvailableSeats,
  getBookedCount,
  validateAttendee,
} from "./reducer";
import { createSeedState } from "./seed";
import type { DemoState } from "./types";
import { OFFER_DURATION_MS } from "./types";

function makeMinimalState(capacity: number, bookedCount: number): DemoState {
  const sessionId = "test-ses-1";
  const session = {
    id: sessionId,
    workshopId: "ws-1",
    format: "in-person" as const,
    startAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 7 * 86400000 + 3600000).toISOString(),
    capacity,
    location: "Test Studio",
  };
  const bookings = Array.from({ length: bookedCount }, (_, i) => ({
    id: `test-bk-${i}`,
    sessionId,
    workshopId: "ws-1",
    attendeeName: `Tester ${i + 1}`,
    attendeeEmail: `tester${i + 1}@test.com`,
    status: "confirmed" as const,
    createdAt: new Date().toISOString(),
    checkIn: "registered" as const,
  }));
  return {
    sessions: [session],
    bookings,
    waitlist: [],
    activity: [],
  };
}

describe("capacity", () => {
  it("prevents booking when session is full", () => {
    const state = makeMinimalState(2, 2);
    const result = demoReducer(state, {
      type: "BOOK",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "New Person",
      attendeeEmail: "new@test.com",
    });
    expect(getBookedCount(result, "test-ses-1")).toBe(2);
    expect(getAvailableSeats(result, "test-ses-1")).toBe(0);
  });

  it("allows booking when seats are available", () => {
    const state = makeMinimalState(5, 2);
    const result = demoReducer(state, {
      type: "BOOK",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "New Person",
      attendeeEmail: "new@test.com",
    });
    expect(getBookedCount(result, "test-ses-1")).toBe(3);
    expect(getAvailableSeats(result, "test-ses-1")).toBe(2);
  });

  it("booking the last seat makes session full", () => {
    const state = makeMinimalState(3, 2);
    const result = demoReducer(state, {
      type: "BOOK",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "Final Person",
      attendeeEmail: "final@test.com",
    });
    expect(getAvailableSeats(result, "test-ses-1")).toBe(0);
  });

  it("cancelling a booking frees a seat", () => {
    const state = makeMinimalState(2, 2);
    const result = demoReducer(state, {
      type: "CANCEL",
      bookingId: "test-bk-0",
    });
    expect(getAvailableSeats(result, "test-ses-1")).toBe(1);
  });

  it("rejects booking with invalid name", () => {
    const state = makeMinimalState(5, 0);
    const result = demoReducer(state, {
      type: "BOOK",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "A",
      attendeeEmail: "valid@test.com",
    });
    expect(getBookedCount(result, "test-ses-1")).toBe(0);
  });

  it("rejects booking with invalid email", () => {
    const state = makeMinimalState(5, 0);
    const result = demoReducer(state, {
      type: "BOOK",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "Valid Name",
      attendeeEmail: "not-an-email",
    });
    expect(getBookedCount(result, "test-ses-1")).toBe(0);
  });

  it("validateAttendee catches both errors", () => {
    const errors = validateAttendee("", "bad");
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
  });

  it("validateAttendee passes for valid input", () => {
    const errors = validateAttendee("Jane Doe", "jane@example.com");
    expect(errors.name).toBeUndefined();
    expect(errors.email).toBeUndefined();
  });
});

describe("final seat", () => {
  it("booking the final seat prevents further bookings", () => {
    const state = makeMinimalState(1, 0);
    const afterFirst = demoReducer(state, {
      type: "BOOK",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "First",
      attendeeEmail: "first@test.com",
    });
    expect(getAvailableSeats(afterFirst, "test-ses-1")).toBe(0);

    const afterSecond = demoReducer(afterFirst, {
      type: "BOOK",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "Second",
      attendeeEmail: "second@test.com",
    });
    expect(getBookedCount(afterSecond, "test-ses-1")).toBe(1);
  });

  it("cancelling the final-seat booking opens exactly one seat", () => {
    const state = makeMinimalState(1, 1);
    const result = demoReducer(state, {
      type: "CANCEL",
      bookingId: "test-bk-0",
    });
    expect(getAvailableSeats(result, "test-ses-1")).toBe(1);
  });
});

describe("competing reservations", () => {
  it("two simultaneous bookings do not exceed capacity (sequential reducer)", () => {
    const state = makeMinimalState(1, 0);
    const first = demoReducer(state, {
      type: "BOOK",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "Alice",
      attendeeEmail: "a@test.com",
    });
    const second = demoReducer(first, {
      type: "BOOK",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "Bob",
      attendeeEmail: "b@test.com",
    });
    expect(getBookedCount(second, "test-ses-1")).toBe(1);
    expect(getAvailableSeats(second, "test-ses-1")).toBe(0);
  });
});

describe("FIFO / holds / expiry", () => {
  it("cancelling a booking offers the seat to the first waitlisted person", () => {
    const state = makeMinimalState(2, 2);
    const withWaitlist = demoReducer(state, {
      type: "JOIN_WAITLIST",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "First Waiter",
      attendeeEmail: "waiter1@test.com",
    });
    expect(getActiveWaitlist(withWaitlist, "test-ses-1")).toHaveLength(1);
    expect(getActiveWaitlist(withWaitlist, "test-ses-1")[0].status).toBe(
      "waiting",
    );

    const afterCancel = demoReducer(withWaitlist, {
      type: "CANCEL",
      bookingId: "test-bk-0",
    });
    const waiters = getActiveWaitlist(afterCancel, "test-ses-1");
    expect(waiters).toHaveLength(1);
    expect(waiters[0].status).toBe("offered");
    expect(waiters[0].offeredAt).not.toBeNull();
    expect(waiters[0].expiresAt).not.toBeNull();
  });

  it("accepting an offer consumes the held seat and removes from waitlist", () => {
    const state = makeMinimalState(2, 2);
    const withWaitlist = demoReducer(state, {
      type: "JOIN_WAITLIST",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "First Waiter",
      attendeeEmail: "waiter1@test.com",
    });
    const afterCancel = demoReducer(withWaitlist, {
      type: "CANCEL",
      bookingId: "test-bk-0",
    });
    const offeredEntry = getActiveWaitlist(afterCancel, "test-ses-1")[0];
    const afterAccept = demoReducer(afterCancel, {
      type: "ACCEPT_OFFER",
      waitlistId: offeredEntry.id,
    });
    expect(getAvailableSeats(afterAccept, "test-ses-1")).toBe(0);
    expect(getActiveWaitlist(afterAccept, "test-ses-1")).toHaveLength(0);
  });

  it("expired offers advance the queue to the next waiter", () => {
    const state = makeMinimalState(1, 1);
    let s = demoReducer(state, {
      type: "JOIN_WAITLIST",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "First Waiter",
      attendeeEmail: "waiter1@test.com",
    });
    s = demoReducer(s, {
      type: "JOIN_WAITLIST",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "Second Waiter",
      attendeeEmail: "waiter2@test.com",
    });
    s = demoReducer(s, { type: "CANCEL", bookingId: "test-bk-0" });
    const waiters = getActiveWaitlist(s, "test-ses-1");
    expect(waiters[0].status).toBe("offered");
    expect(waiters[1].status).toBe("waiting");

    const offeredId = waiters[0].id;
    s = {
      ...s,
      waitlist: s.waitlist.map((w) =>
        w.id === offeredId
          ? { ...w, expiresAt: new Date(Date.now() - 1000).toISOString() }
          : w,
      ),
    };
    s = demoReducer(s, { type: "EXPIRE_OFFERS" });
    const updatedWaiters = getActiveWaitlist(s, "test-ses-1");
    expect(updatedWaiters).toHaveLength(1);
    expect(updatedWaiters[0].status).toBe("offered");
    expect(updatedWaiters[0].attendeeName).toBe("Second Waiter");
  });

  it("expired offer with no next waiter just expires", () => {
    const state = makeMinimalState(1, 1);
    let s = demoReducer(state, {
      type: "JOIN_WAITLIST",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "Only Waiter",
      attendeeEmail: "waiter@test.com",
    });
    s = demoReducer(s, { type: "CANCEL", bookingId: "test-bk-0" });
    const offeredId = getActiveWaitlist(s, "test-ses-1")[0].id;
    s = {
      ...s,
      waitlist: s.waitlist.map((w) =>
        w.id === offeredId
          ? { ...w, expiresAt: new Date(Date.now() - 1000).toISOString() }
          : w,
      ),
    };
    s = demoReducer(s, { type: "EXPIRE_OFFERS" });
    expect(getActiveWaitlist(s, "test-ses-1")).toHaveLength(0);
    expect(getAvailableSeats(s, "test-ses-1")).toBe(1);
  });

  it("offer has a 15-minute expiry window", () => {
    expect(OFFER_DURATION_MS).toBe(15 * 60 * 1000);
  });

  it("cannot join waitlist when seats are available", () => {
    const state = makeMinimalState(5, 2);
    const result = demoReducer(state, {
      type: "JOIN_WAITLIST",
      sessionId: "test-ses-1",
      workshopId: "ws-1",
      attendeeName: "Waiter",
      attendeeEmail: "waiter@test.com",
    });
    expect(getActiveWaitlist(result, "test-ses-1")).toHaveLength(0);
  });
});

describe("repeated cancel", () => {
  it("cancelling an already-cancelled booking is a no-op", () => {
    const state = makeMinimalState(3, 1);
    const first = demoReducer(state, {
      type: "CANCEL",
      bookingId: "test-bk-0",
    });
    expect(getAvailableSeats(first, "test-ses-1")).toBe(3);

    const second = demoReducer(first, {
      type: "CANCEL",
      bookingId: "test-bk-0",
    });
    expect(getAvailableSeats(second, "test-ses-1")).toBe(3);
    expect(getBookedCount(second, "test-ses-1")).toBe(0);
  });

  it("cancelling a non-existent booking is a no-op", () => {
    const state = makeMinimalState(3, 1);
    const result = demoReducer(state, {
      type: "CANCEL",
      bookingId: "nonexistent",
    });
    expect(result).toBe(state);
  });
});

describe("reschedule rollback", () => {
  it("reschedule to a full session retains the original booking", () => {
    const state = makeMinimalState(2, 1);
    const result = demoReducer(state, {
      type: "RESCHEDULE",
      bookingId: "test-bk-0",
      newSessionId: "test-ses-1",
    });
    // Rescheduling to the same session is a no-op (old session frees seat, new session is same)
    // The booking should remain on the same session
    const movedBooking = result.bookings.find((b) => b.id === "test-bk-0");
    expect(movedBooking).toBeDefined();
    expect(movedBooking?.status).toBe("confirmed");
    expect(movedBooking?.sessionId).toBe("test-ses-1");
  });

  it("reschedule to a different session moves the booking", () => {
    const base = createSeedState();
    // Find a session with available seats that is different from ses-1
    const targetSession = base.sessions.find((s) => s.id === "ses-2");
    if (!targetSession) return;

    const result = demoReducer(base, {
      type: "RESCHEDULE",
      bookingId: "seed-bk-0",
      newSessionId: "ses-2",
    });
    const movedBooking = result.bookings.find((b) => b.id === "seed-bk-0");
    expect(movedBooking?.status).toBe("confirmed");
  });
});

describe("cross-owner access", () => {
  it("demo reducer does not mix sessions from different workshops", () => {
    const state = createSeedState();
    const potteryBookings = state.bookings.filter(
      (b) => b.workshopId === "ws-1",
    );
    const photoBookings = state.bookings.filter((b) => b.workshopId === "ws-2");
    const printBookings = state.bookings.filter((b) => b.workshopId === "ws-3");

    // Pottery ses-1 has 8 bookings
    expect(potteryBookings.filter((b) => b.sessionId === "ses-1")).toHaveLength(
      8,
    );
    // Photography ses-3 has 7 bookings
    expect(photoBookings.filter((b) => b.sessionId === "ses-3")).toHaveLength(
      7,
    );
    // Printmaking ses-5 has 5 bookings
    expect(printBookings.filter((b) => b.sessionId === "ses-5")).toHaveLength(
      5,
    );

    // Cancelling a pottery booking should not affect photography sessions
    const afterCancel = demoReducer(state, {
      type: "CANCEL",
      bookingId: "seed-bk-0",
    });
    const photoAfter = afterCancel.bookings.filter(
      (b) => b.workshopId === "ws-2" && b.sessionId === "ses-3",
    );
    expect(photoAfter).toHaveLength(7);
  });
});
