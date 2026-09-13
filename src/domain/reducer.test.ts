import { describe, it, expect } from 'vitest';
import { demoReducer, getAvailableSeats, getBookedCount, getActiveWaitlist, validateAttendee } from './reducer';
import { createSeedState } from './seed';
import type { DemoState } from './types';
import { OFFER_DURATION_MS } from './types';

function makeMinimalState(capacity: number, bookedCount: number): DemoState {
  const base = createSeedState();
  const sessionId = 'test-ses-1';
  const session = {
    id: sessionId,
    workshopId: 'ws-1',
    format: 'in-person' as const,
    startAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 7 * 86400000 + 3600000).toISOString(),
    capacity,
    location: 'Test Studio',
  };
  const bookings = Array.from({ length: bookedCount }, (_, i) => ({
    id: `test-bk-${i}`,
    sessionId,
    workshopId: 'ws-1',
    attendeeName: `Tester ${i + 1}`,
    attendeeEmail: `tester${i + 1}@test.com`,
    status: 'confirmed' as const,
    createdAt: new Date().toISOString(),
    checkIn: 'registered' as const,
  }));
  return {
    sessions: [session],
    bookings,
    waitlist: [],
    activity: [],
  };
}

describe('capacity', () => {
  it('prevents booking when session is full', () => {
    const state = makeMinimalState(2, 2);
    const result = demoReducer(state, {
      type: 'BOOK',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'New Person',
      attendeeEmail: 'new@test.com',
    });
    expect(getBookedCount(result, 'test-ses-1')).toBe(2);
    expect(getAvailableSeats(result, 'test-ses-1')).toBe(0);
  });

  it('allows booking when seats are available', () => {
    const state = makeMinimalState(5, 2);
    const result = demoReducer(state, {
      type: 'BOOK',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'New Person',
      attendeeEmail: 'new@test.com',
    });
    expect(getBookedCount(result, 'test-ses-1')).toBe(3);
    expect(getAvailableSeats(result, 'test-ses-1')).toBe(2);
  });

  it('booking the last seat makes session full', () => {
    const state = makeMinimalState(3, 2);
    const result = demoReducer(state, {
      type: 'BOOK',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'Final Person',
      attendeeEmail: 'final@test.com',
    });
    expect(getAvailableSeats(result, 'test-ses-1')).toBe(0);
  });

  it('cancelling a booking frees a seat', () => {
    const state = makeMinimalState(2, 2);
    const result = demoReducer(state, {
      type: 'CANCEL',
      bookingId: 'test-bk-0',
    });
    expect(getAvailableSeats(result, 'test-ses-1')).toBe(1);
  });

  it('rejects booking with invalid name', () => {
    const state = makeMinimalState(5, 0);
    const result = demoReducer(state, {
      type: 'BOOK',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'A',
      attendeeEmail: 'valid@test.com',
    });
    expect(getBookedCount(result, 'test-ses-1')).toBe(0);
  });

  it('rejects booking with invalid email', () => {
    const state = makeMinimalState(5, 0);
    const result = demoReducer(state, {
      type: 'BOOK',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'Valid Name',
      attendeeEmail: 'not-an-email',
    });
    expect(getBookedCount(result, 'test-ses-1')).toBe(0);
  });

  it('validateAttendee catches both errors', () => {
    const errors = validateAttendee('', 'bad');
    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
  });

  it('validateAttendee passes for valid input', () => {
    const errors = validateAttendee('Jane Doe', 'jane@example.com');
    expect(errors.name).toBeUndefined();
    expect(errors.email).toBeUndefined();
  });
});

describe('waitlist and offer expiry', () => {
  it('cancelling a booking offers the seat to the first waitlisted person', () => {
    const state = makeMinimalState(2, 2);

    // Join waitlist
    const withWaitlist = demoReducer(state, {
      type: 'JOIN_WAITLIST',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'First Waiter',
      attendeeEmail: 'waiter1@test.com',
    });

    expect(getActiveWaitlist(withWaitlist, 'test-ses-1')).toHaveLength(1);
    expect(getActiveWaitlist(withWaitlist, 'test-ses-1')[0].status).toBe('waiting');

    // Cancel a booking — should offer to first waiter
    const afterCancel = demoReducer(withWaitlist, {
      type: 'CANCEL',
      bookingId: 'test-bk-0',
    });

    const waiters = getActiveWaitlist(afterCancel, 'test-ses-1');
    expect(waiters).toHaveLength(1);
    expect(waiters[0].status).toBe('offered');
    expect(waiters[0].offeredAt).not.toBeNull();
    expect(waiters[0].expiresAt).not.toBeNull();
  });

  it('accepting an offer consumes the held seat and removes from waitlist', () => {
    const state = makeMinimalState(2, 2);

    const withWaitlist = demoReducer(state, {
      type: 'JOIN_WAITLIST',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'First Waiter',
      attendeeEmail: 'waiter1@test.com',
    });

    const afterCancel = demoReducer(withWaitlist, {
      type: 'CANCEL',
      bookingId: 'test-bk-0',
    });

    const offeredEntry = getActiveWaitlist(afterCancel, 'test-ses-1')[0];

    const afterAccept = demoReducer(afterCancel, {
      type: 'ACCEPT_OFFER',
      waitlistId: offeredEntry.id,
    });

    // Seat is now taken by the accepted waiter
    expect(getAvailableSeats(afterAccept, 'test-ses-1')).toBe(0);
    // The waiter is no longer in the active waitlist (status = 'booked')
    expect(getActiveWaitlist(afterAccept, 'test-ses-1')).toHaveLength(0);
  });

  it('expired offers advance the queue to the next waiter', () => {
    const state = makeMinimalState(1, 1);

    // Add two waiters
    let s = demoReducer(state, {
      type: 'JOIN_WAITLIST',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'First Waiter',
      attendeeEmail: 'waiter1@test.com',
    });
    s = demoReducer(s, {
      type: 'JOIN_WAITLIST',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'Second Waiter',
      attendeeEmail: 'waiter2@test.com',
    });

    // Cancel the booking — offers to first waiter
    s = demoReducer(s, { type: 'CANCEL', bookingId: 'test-bk-0' });

    const waiters = getActiveWaitlist(s, 'test-ses-1');
    expect(waiters[0].status).toBe('offered');
    expect(waiters[1].status).toBe('waiting');

    // Manually expire the offer by setting expiresAt to the past
    const offeredId = waiters[0].id;
    s = {
      ...s,
      waitlist: s.waitlist.map((w) =>
        w.id === offeredId
          ? { ...w, expiresAt: new Date(Date.now() - 1000).toISOString() }
          : w
      ),
    };

    // Run EXPIRE_OFFERS — should expire first offer and advance to second waiter
    s = demoReducer(s, { type: 'EXPIRE_OFFERS' });

    const updatedWaiters = getActiveWaitlist(s, 'test-ses-1');
    // First waiter is now expired (not in active list)
    expect(updatedWaiters).toHaveLength(1);
    expect(updatedWaiters[0].status).toBe('offered');
    expect(updatedWaiters[0].attendeeName).toBe('Second Waiter');
  });

  it('expired offer with no next waiter just expires', () => {
    const state = makeMinimalState(1, 1);

    let s = demoReducer(state, {
      type: 'JOIN_WAITLIST',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'Only Waiter',
      attendeeEmail: 'waiter@test.com',
    });

    s = demoReducer(s, { type: 'CANCEL', bookingId: 'test-bk-0' });

    const offeredId = getActiveWaitlist(s, 'test-ses-1')[0].id;
    s = {
      ...s,
      waitlist: s.waitlist.map((w) =>
        w.id === offeredId
          ? { ...w, expiresAt: new Date(Date.now() - 1000).toISOString() }
          : w
      ),
    };

    s = demoReducer(s, { type: 'EXPIRE_OFFERS' });

    expect(getActiveWaitlist(s, 'test-ses-1')).toHaveLength(0);
    // Seat is available again
    expect(getAvailableSeats(s, 'test-ses-1')).toBe(1);
  });

  it('offer has a 15-minute expiry window', () => {
    expect(OFFER_DURATION_MS).toBe(15 * 60 * 1000);
  });

  it('cannot join waitlist when seats are available', () => {
    const state = makeMinimalState(5, 2);
    const result = demoReducer(state, {
      type: 'JOIN_WAITLIST',
      sessionId: 'test-ses-1',
      workshopId: 'ws-1',
      attendeeName: 'Waiter',
      attendeeEmail: 'waiter@test.com',
    });
    expect(getActiveWaitlist(result, 'test-ses-1')).toHaveLength(0);
  });
});
