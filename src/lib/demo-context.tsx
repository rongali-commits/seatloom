import type { DemoAction } from "@/domain/reducer";
import type { DemoState } from "@/domain/types";
import { createContext, useContext, type ReactNode } from "react";

interface DemoContextValue {
  state: DemoState;
  dispatch: React.Dispatch<DemoAction>;
  reset: () => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export function DemoProvider({
  state,
  dispatch,
  reset,
  children,
}: {
  state: DemoState;
  dispatch: React.Dispatch<DemoAction>;
  reset: () => void;
  children: ReactNode;
}) {
  return (
    <DemoContext.Provider value={{ state, dispatch, reset }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}
