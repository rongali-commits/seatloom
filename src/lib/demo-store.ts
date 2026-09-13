import { useReducer, useEffect, useCallback, useRef } from 'react';
import { demoReducer } from '@/domain/reducer';
import { createSeedState } from '@/domain/seed';
import type { DemoState } from '@/domain/types';

const STORAGE_KEY = 'seatloom-demo-v1';

function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (parsed.sessions && parsed.bookings) return parsed;
    }
  } catch {
    // fall through to seed
  }
  return createSeedState();
}

function saveState(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage may be full or unavailable — demo continues in memory
  }
}

export function useDemoState() {
  const [state, dispatch] = useReducer(demoReducer, undefined, loadState);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    saveState(state);
  }, [state]);

  // Expire offers on mount and periodically
  useEffect(() => {
    dispatch({ type: 'EXPIRE_OFFERS' });
    const interval = setInterval(() => dispatch({ type: 'EXPIRE_OFFERS' }), 30000);
    return () => clearInterval(interval);
  }, []);

  const reset = useCallback(() => {
    const seed = createSeedState();
    dispatch({ type: 'LOAD', state: seed });
    saveState(seed);
  }, []);

  return { state, dispatch, reset };
}
