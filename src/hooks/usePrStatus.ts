import { useEffect, useState } from "react";
import { gitPrStatus, type GitPr } from "../lib/fs";

type PrStatus = {
  pr: GitPr | null;
  settled: boolean;
};

type CacheEntry = PrStatus & {
  loading: Promise<GitPr | null> | null;
  listeners: Set<() => void>;
};

const entries = new Map<string, CacheEntry>();

function entryFor(cwd: string): CacheEntry {
  let entry = entries.get(cwd);
  if (!entry) {
    entry = { pr: null, settled: false, loading: null, listeners: new Set() };
    entries.set(cwd, entry);
  }
  return entry;
}

function snapshot(cwd: string, enabled: boolean): PrStatus {
  if (!enabled || !cwd || cwd === "~") return { pr: null, settled: false };
  const { pr, settled } = entryFor(cwd);
  return { pr, settled };
}

/** Refresh the shared PR lookup used by the sidebar and command palette. */
export function refreshPrStatus(cwd: string): Promise<GitPr | null> {
  if (!cwd || cwd === "~") return Promise.resolve(null);
  const entry = entryFor(cwd);
  if (entry.loading) return entry.loading;

  entry.loading = gitPrStatus(cwd)
    .then((pr) => {
      entry.pr = pr;
      entry.settled = true;
      return pr;
    })
    .catch((error) => {
      entry.settled = true;
      throw error;
    })
    .finally(() => {
      entry.loading = null;
      for (const listener of entry.listeners) listener();
    });
  return entry.loading;
}

export function usePrStatus(cwd: string, enabled: boolean): PrStatus {
  const [status, setStatus] = useState<PrStatus>(() => snapshot(cwd, enabled));

  useEffect(() => {
    setStatus(snapshot(cwd, enabled));
    if (!enabled || !cwd || cwd === "~") return;

    const entry = entryFor(cwd);
    const update = () => setStatus(snapshot(cwd, true));
    entry.listeners.add(update);
    if (!entry.settled) void refreshPrStatus(cwd).catch(() => undefined);
    return () => {
      entry.listeners.delete(update);
    };
  }, [cwd, enabled]);

  return status;
}
