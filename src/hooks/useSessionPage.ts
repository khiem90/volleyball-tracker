"use client";

/* The public session state machine. Three constraints, all deliberate:
   - `settled`: nothing is called "not found" until the first lookup has
     actually answered — `SessionContext` initialises `isLoading` to false, so
     trusting it flashes "Session Not Found" on every first paint.
   - `held`: the last non-null session is kept so the ended screen still has
     final scores to draw.
   - `classify`: `SessionContext`'s error strings are mapped to product states
     and discarded — no raw Firebase message may reach the public page. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useAuth } from "@/context/AuthContext";
import type { Session } from "@/types/session";

/**
 * What the route draws. Every one of these is a designed screen; none of them
 * is a fallback.
 */
export type SessionPhase =
  | "loading"
  | "ready"
  | "ended"
  | "notfound"
  | "denied"
  | "unavailable";

type ErrorKind = "notfound" | "ended" | "denied" | "fault" | null;

/**
 * The provider's message, read once and discarded. Patterns are anchored to
 * the strings `SessionContext` itself writes; anything unrecognised falls to
 * `fault`, the safe classification — it keeps the content on screen.
 */
const classify = (error: string | null): ErrorKind => {
  if (!error) return null;
  const text = error.toLowerCase();
  if (text.includes("not found")) return "notfound";
  if (text.includes("ended")) return "ended";
  if (
    text.includes("permission") ||
    text.includes("insufficient") ||
    text.includes("unauthor") ||
    text.includes("unauthenticated")
  ) {
    return "denied";
  }
  return "fault";
};

export interface SessionPageState {
  phase: SessionPhase;
  /** The session to draw — live, or the last one held before it ended. */
  view: Session | null;
  /** True while the live feed is faulted but the content on screen is valid. */
  faulted: boolean;
  shareCode: string;
  role: ReturnType<typeof useSession>["role"];
  canEdit: boolean;
  isCreator: boolean;
  user: ReturnType<typeof useAuth>["user"];
  isConfigured: boolean;
  /** An `?admin=` token was present and did not match this event. */
  tokenRejected: boolean;
  dismissTokenNotice: () => void;
  shareUrl: string;
  adminShareUrl: string | null;
  retry: () => void;
  leave: () => void;
  openMatch: (matchId: string) => void;
  showAuth: boolean;
  setShowAuth: (open: boolean) => void;
  showShare: boolean;
  setShowShare: (open: boolean) => void;
}

export const useSessionPage = (): SessionPageState => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const shareCode = String(params?.shareCode ?? "");
  const adminTokenFromUrl = searchParams.get("admin");

  const {
    session,
    role,
    error,
    joinSession,
    leaveSession,
    applyAdminToken,
    canEdit,
    isCreator,
    getShareUrl,
    getAdminShareUrl,
  } = useSession();
  const { user, isConfigured } = useAuth();

  const [showAuth, setShowAuth] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [settled, setSettled] = useState(false);
  const [tokenRejected, setTokenRejected] = useState(false);

  /* -------------------------------------------------------------- joining */

  /* The join guard must be a REF: in state, writing it re-ran the effect and
     cancelled the in-flight join, so `settled` never flipped and unknown codes
     spun forever. A ref also keeps StrictMode's double-invoke to one join. */
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shareCode || !isConfigured || joinedRef.current === shareCode) return;
    joinedRef.current = shareCode;
    /* In a `.finally`: `settled` may only become true once the lookup has
       answered, or the not-found flash returns. */
    void joinSession(shareCode).finally(() => setSettled(true));
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- `joinSession`
       is recreated whenever the stored-token map changes, which would re-join
       the session mid-watch. The code is the identity of this subscription. */
  }, [shareCode, isConfigured]);

  /* ------------------------------------------------------------- the hold */

  /* Render-time adjustment, not an effect: an effect would paint one frame
     with the content already gone. */
  const [held, setHeld] = useState<{ code: string; session: Session } | null>(null);
  if (session && held?.session !== session) {
    setHeld({ code: shareCode, session });
  } else if (!session && held && held.code !== shareCode) {
    setHeld(null);
  }

  /* ------------------------------------------------------- the admin token */

  useEffect(() => {
    if (!adminTokenFromUrl || !session || canEdit) return;
    if (applyAdminToken(adminTokenFromUrl)) {
      setTokenRejected(false);
      /* Strip the token from the URL immediately — it is already in history
         and the referrer; nothing here may make that worse. */
      router.replace(`/session/${shareCode}`);
    } else {
      setTokenRejected(true);
    }
  }, [adminTokenFromUrl, session, canEdit, applyAdminToken, router, shareCode]);

  /* -------------------------------------------------------------- actions */

  const retry = useCallback(() => {
    setSettled(false);
    void joinSession(shareCode).finally(() => setSettled(true));
  }, [joinSession, shareCode]);

  const leave = useCallback(() => {
    leaveSession();
    router.push("/");
  }, [leaveSession, router]);

  const openMatch = useCallback(
    (matchId: string) => router.push(`/match/${matchId}`),
    [router]
  );

  const dismissTokenNotice = useCallback(() => setTokenRejected(false), []);

  /* ---------------------------------------------------------------- phase */

  const kind = classify(error);
  const view = session ?? held?.session ?? null;

  const phase = useMemo<SessionPhase>(() => {
    if (!isConfigured) return "unavailable";
    if (!settled && !view) return "loading";
    if (view) {
      if (session) return "ready";
      return kind === "denied" ? "denied" : "ended";
    }
    if (kind === "notfound") return "notfound";
    if (kind === "denied") return "denied";
    if (kind) return "unavailable";
    return settled ? "notfound" : "loading";
  }, [isConfigured, settled, view, session, kind]);

  return {
    phase,
    view,
    /* A fault only *matters* while there is something on screen it could be
       lying about. With no content the phase already carries it. */
    faulted: kind === "fault" && Boolean(view),
    shareCode,
    role,
    canEdit,
    isCreator,
    user,
    isConfigured,
    tokenRejected,
    dismissTokenNotice,
    shareUrl: getShareUrl(),
    adminShareUrl: getAdminShareUrl(),
    retry,
    leave,
    openMatch,
    showAuth,
    setShowAuth,
    showShare,
    setShowShare,
  };
};
