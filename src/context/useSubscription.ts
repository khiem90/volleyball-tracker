"use client";

import { useEffect, useState } from "react";
import type { Firestore, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * What a Firestore subscription last delivered, and the error that ended
 * it. Nothing is read while `key` is null; a new key opens the
 * subscription again, which is how a listener the rules refused comes back
 * once the reader may read again. The value is null until the first
 * delivery and whenever there is no key.
 */
export const useSubscription = <T>(
  key: string | null,
  subscribe: (
    db: Firestore,
    onChange: (value: T) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe,
): { value: T | null; error: Error | null } => {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (key === null || !db) {
      setValue(null);
      return;
    }
    setError(null);
    return subscribe(
      db,
      (next) => {
        setValue(next);
        setError(null);
      },
      setError,
    );
    // The key names everything the subscription reads, so `subscribe`, a
    // new function each render, is left out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, error };
};
