import { afterEach, describe, expect, it, vi } from "vitest";
import { demoReducer, getAvailableSeats, getBookedCount } from "./reducer";
import type { DemoState } from "./types";

const attendee = {
  attendeeName: "Demo Guest",
  attendeeEmail: "guest@example.com",
};
function fixture(): DemoState {
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  return {
    sessions: ["a", "b"].map((id) => ({
      id,
      workshopId: "w",
      format: "in-person",
      startAt: tomorrow,
      endAt: new Date(Date.now() + 90000000).toISOString(),
      capacity: 1,
      location: "Demo studio",
    })),
    bookings: [
      {
        id: "old",
        sessionId: "a",
        workshopId: "w",
        ...attendee,
        status: "confirmed",
        checkIn: "registered",
        createdAt: new Date().toISOString(),
      },
    ],
    waitlist: [],
    activity: [],
  };
}
function queued(): DemoState {
  return demoReducer(fixture(), {
    type: "JOIN_WAITLIST",
    sessionId: "a",
    workshopId: "w",
    attendeeName: "Waiting Guest",
    attendeeEmail: "waiting@example.com",
  });
}
describe("independent release regressions", () => {
  afterEach(() => vi.useRealTimers());
  it("rescheduling retains a confirmed seat in the destination", () => {
    const s = demoReducer(fixture(), {
      type: "RESCHEDULE",
      bookingId: "old",
      newSessionId: "b",
    });
    expect(getBookedCount(s, "b")).toBe(1);
    expect(getAvailableSeats(s, "b")).toBe(0);
    expect(getBookedCount(s, "a")).toBe(0);
  });
  it("full destination leaves the original booking untouched", () => {
    const s = fixture();
    s.bookings.push({
      ...s.bookings[0],
      id: "other",
      sessionId: "b",
      attendeeEmail: "other@example.com",
    });
    const next = demoReducer(s, {
      type: "RESCHEDULE",
      bookingId: "old",
      newSessionId: "b",
    });
    expect(next.bookings.find((b) => b.id === "old")?.sessionId).toBe("a");
  });
  it("held offer cannot be stolen by a newcomer", () => {
    const s = demoReducer(queued(), { type: "CANCEL", bookingId: "old" });
    expect(getAvailableSeats(s, "a")).toBe(0);
    const next = demoReducer(s, {
      type: "BOOK",
      sessionId: "a",
      workshopId: "w",
      attendeeName: "New Guest",
      attendeeEmail: "new@example.com",
    });
    expect(
      next.bookings.filter(
        (b) => b.status === "confirmed" && b.sessionId === "a",
      ),
    ).toHaveLength(0);
  });
  it("expired offer cannot be accepted without a separate expiry action", () => {
    const s = demoReducer(queued(), { type: "CANCEL", bookingId: "old" });
    const offer = s.waitlist.find((w) => w.status === "offered")!;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(offer.expiresAt!).getTime() + 1);
    const next = demoReducer(s, { type: "ACCEPT_OFFER", waitlistId: offer.id });
    expect(next.bookings.filter((b) => b.status === "confirmed")).toHaveLength(
      0,
    );
  });
  it("duplicate attendee cannot reserve the same session twice", () => {
    const s = fixture();
    s.sessions[0].capacity = 3;
    const next = demoReducer(s, {
      type: "BOOK",
      sessionId: "a",
      workshopId: "w",
      ...attendee,
    });
    expect(getBookedCount(next, "a")).toBe(1);
  });
  it("rejects mismatched workshop and session", () => {
    const s = demoReducer(fixture(), {
      type: "BOOK",
      sessionId: "b",
      workshopId: "wrong",
      ...attendee,
    });
    expect(getBookedCount(s, "b")).toBe(0);
  });
  it("rejects past session bookings", () => {
    const s = fixture();
    s.sessions[1].startAt = "2020-01-01T10:00:00Z";
    expect(
      getBookedCount(
        demoReducer(s, {
          type: "BOOK",
          sessionId: "b",
          workshopId: "w",
          ...attendee,
        }),
        "b",
      ),
    ).toBe(0);
  });
  it("repeated cancellation does not create additional offers", () => {
    const s = demoReducer(queued(), { type: "CANCEL", bookingId: "old" });
    expect(
      demoReducer(s, { type: "CANCEL", bookingId: "old" }).waitlist,
    ).toEqual(s.waitlist);
  });
});
