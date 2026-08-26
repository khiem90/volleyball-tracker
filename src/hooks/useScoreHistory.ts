"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ===========================================================================
   ONE UNDO STACK, FOR BOTH CONSOLES

   The trap this exists for: a caller doing score arithmetic against a value
   React has not re-rendered yet loses rapid taps ("use the updater form"
   cannot fix it — a `useState` updater cannot RETURN the new score, and both
   consoles need it synchronously: one writes it to `AppContext`, the other
   renders it).

   So the stack is a synchronous cursor. `entriesRef` is advanced inside the
   event handler, before `setEntries` publishes it, and every mutation below
   reads its base from that cursor rather than from a closure or from props.
   Five taps in one batch therefore read 0 → 1 → 2 → 3 → 4 → 5 and
   five undos walk back down the same steps. No caller anywhere is allowed to
   compute a score: `bump(side, delta)` and `undo()` own the arithmetic outright,
   which is what makes the class of bug unrepresentable rather than merely fixed.

   The mutation lives in the handler and never inside a `setState` updater, so
   StrictMode's double-invocation of updaters cannot double-count a point.

   --------------------------------------------------------- surviving reload

   The stack persists to
   `sessionStorage` under `storageKey`, and is restored only when the stored tip
   still matches the score the caller seeds with — a stack whose tip disagrees
   with reality belongs to a game that has since moved on (a series reset, an
   edit made on the competition screen, another tab) and is discarded rather
   than replayed.

   Restoration happens in an effect, never in the `useState` initialiser:
   `sessionStorage` does not exist during SSR, so an initialiser would render
   `canUndo` differently on the server and the client and hydrate as a mismatch.
   Pass `storageKey: null` until the real score is known — the console does
   exactly that while the match is still hydrating — and the restore runs once,
   against a seed that means something.
   =========================================================================== */

export interface MbScorePoint {
  home: number;
  away: number;
}

export type MbScoreSideId = "home" | "away";

const samePoint = (a: MbScorePoint, b: MbScorePoint): boolean =>
  a.home === b.home && a.away === b.away;

const isPoint = (value: unknown): value is MbScorePoint =>
  typeof value === "object" &&
  value !== null &&
  Number.isFinite((value as MbScorePoint).home) &&
  Number.isFinite((value as MbScorePoint).away);

/** Reads a persisted stack. Any parse failure is treated as "no stack". */
const readStack = (key: string): MbScorePoint[] | null => {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every(isPoint)) return null;
    return parsed.map((point) => ({ home: point.home, away: point.away }));
  } catch {
    return null;
  }
};

const writeStack = (key: string, entries: MbScorePoint[]): void => {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entries));
  } catch {
    /* Private mode and quota exhaustion both land here. A stack that cannot be
       written will simply not survive a reload, which the console already
       reports honestly through `canUndo`. It is not worth an error. */
  }
};

export interface MbScoreHistory {
  /** The stack, oldest first. Never empty. */
  entries: MbScorePoint[];
  /** The score according to the stack. */
  tip: MbScorePoint;
  canUndo: boolean;
  /**
   * True once the persisted stack has been consulted. Until then the console
   * knows only that it has not looked yet, which is not the same as "no undo".
   */
  restored: boolean;
  /** Adds `delta` to one side, floors at 0, returns the new score. */
  bump: (side: MbScoreSideId, delta: number) => MbScorePoint;
  /** Steps back one entry and returns the score to apply, or null at the root. */
  undo: () => MbScorePoint | null;
  /** Throws the stack away and starts again from `seed`. */
  reset: (seed: MbScorePoint) => void;
  /**
   * Adopts an externally-authored score — a remote write in a shared session,
   * an edit made on the competition screen, the 0–0 that opens the next game of
   * a series. A no-op when it already agrees with the stack.
   */
  reconcile: (external: MbScorePoint) => void;
}

export const useScoreHistory = ({
  seed,
  storageKey = null,
}: {
  seed: MbScorePoint;
  /** `sessionStorage` key. Null keeps the stack in memory and skips restore. */
  storageKey?: string | null;
}): MbScoreHistory => {
  const [entries, setEntries] = useState<MbScorePoint[]>(() => [seed]);
  /** The key whose persisted stack has already been consulted. */
  const [restoredFor, setRestoredFor] = useState<string | null>(null);

  /**
   * The synchronous cursor. Every mutation below reads and advances THIS, from
   * inside an event handler, which is the whole mechanism: it is one tap ahead
   * of `entries` for exactly as long as React takes to re-render, and that gap
   * is where five rapid taps used to collapse into one.
   *
   * It is re-affirmed from `entries` in an effect rather than during render,
   * so the two can never drift if a render is discarded.
   */
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  /** Publishes the cursor. Only ever called from a handler. */
  const commit = useCallback((next: MbScorePoint[]) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  /* -------------------------------------------------------------- restore

     Done DURING RENDER, keyed on `storageKey` — React's documented way to
     adjust state when an input changes, and the reason there is no effect here.
     An effect would paint one frame with the wrong `canUndo` and would have to
     read the seed through a ref to avoid re-running on every point.

     It cannot run before `storageKey` is real, and on the server `storageKey`
     is null (the match has not been read out of localStorage yet), so this
     never runs during SSR and never produces a hydration mismatch. */
  if (storageKey && restoredFor !== storageKey && typeof window !== "undefined") {
    setRestoredFor(storageKey);
    const stored = readStack(storageKey);
    const tip = stored?.[stored.length - 1];
    /* `setEntries`, not `commit`: the cursor is a ref and a render may not
       touch one. The effect above re-affirms it from `entries` on the very next
       commit, which is long before any tap can reach a handler. */
    setEntries(stored && tip && samePoint(tip, seed) ? stored : [seed]);
  }

  const restored = storageKey === null || restoredFor === storageKey;

  useEffect(() => {
    if (!storageKey || !restored) return;
    writeStack(storageKey, entries);
  }, [storageKey, entries, restored]);

  /* ------------------------------------------------------------ mutations */

  const bump = useCallback(
    (side: MbScoreSideId, delta: number): MbScorePoint => {
      const current = entriesRef.current;
      const base = current[current.length - 1] ?? { home: 0, away: 0 };
      const next: MbScorePoint = {
        home: side === "home" ? Math.max(0, base.home + delta) : base.home,
        away: side === "away" ? Math.max(0, base.away + delta) : base.away,
      };
      /* A `−` at 0–0 changes nothing; it must not push a duplicate entry, or
         Undo would appear available and then do nothing when pressed. */
      if (samePoint(base, next)) return next;
      commit([...current, next]);
      return next;
    },
    [commit]
  );

  const undo = useCallback((): MbScorePoint | null => {
    const current = entriesRef.current;
    if (current.length < 2) return null;
    const target = current[current.length - 2];
    commit(current.slice(0, -1));
    return target;
  }, [commit]);

  const reset = useCallback(
    (next: MbScorePoint) => commit([{ home: next.home, away: next.away }]),
    [commit]
  );

  const reconcile = useCallback(
    (external: MbScorePoint) => {
      const current = entriesRef.current;
      const tip = current[current.length - 1];
      if (tip && samePoint(tip, external)) return;
      commit([{ home: external.home, away: external.away }]);
    },
    [commit]
  );

  return {
    entries,
    tip: entries[entries.length - 1] ?? seed,
    canUndo: entries.length > 1,
    restored,
    bump,
    undo,
    reset,
    reconcile,
  };
};
