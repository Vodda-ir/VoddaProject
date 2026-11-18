"use client";

import { createContext, useContext, type PropsWithChildren } from "react";
import type { PlatformRuntime } from "./types";

const PlatformContext = createContext<PlatformRuntime | null>(null);

export type PlatformProviderProps = PropsWithChildren<{
  runtime: PlatformRuntime;
}>;

export function PlatformProvider({ runtime, children }: PlatformProviderProps) {
  return <PlatformContext.Provider value={runtime}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformRuntime {
  const runtime = useContext(PlatformContext);
  if (!runtime) {
    throw new Error("usePlatform must be used inside PlatformProvider");
  }
  return runtime;
}
