"use client";

/* ===========================================================================
   THE PUBLIC SESSION STATE MACHINE (public-share brief §2.4, W6 / P3b)

   This file used to be a data hook with a bug in it. It is now a state machine
   with the data moved out (`useMatchbookSession` owns every number on screen).

   THE BUG, because it is the reason this screen was the worst one in the app.
   The route rendered:

       if (isLoading)        <SessionLoadingState/>
       if (error || !session) <SessionErrorState/>

   against a `SessionContext` that initialises `isLoading` to **false**. So the
   first paint of every single visit — before Firestore has been asked anything
   — took the second branch and printed "Session Not Found" to a stranger who
   had just been handed the link. Verified in the audit at 700ms.

   The same `error ||` short-circuit is also the offline path and the
   permission path: `SessionContext` calls `setError(err.message)` on every
   `onSnapshot` failure and never clears it, and never touches `session`. One
   dropped websocket frame therefore replaced a live scoreboard with a
   permanent dead-end card carrying a raw Firebase string, with perfectly good
   data still in memory two feet away.

   Three properties fix it, and all three live here rather than in
   `SessionContext` — which is shared with `/match/[id]` and `AppContext` and
   is not this workstream's file:

     1. **`settled`.** Nothing is called "not found" until the first lookup has
        actually answered. Before that the phase is `loading`, whatever `error`
        says.
     2. **`held`.** The last non-null session is kept. When the document goes
        away — ended, or a rules change — the screen still has the final scores
        to draw, so "That's full time" is a state with content in it instead of
        a card with a Home button.
     3. **`classify`.** The provider's message is turned into one of five
        product states and then thrown away. No Firebase string, and no word
        "Firebase", reaches the public (invariant 28). A transient fault is
        `faulted`, not a phase: the content stays and a banner appears over it.

   `?admin=<token>` keeps its existing behaviour — validated, stored, stripped
   from the URL — and gains the one thing it never had: a rejected token now
   says so, instead of silently leaving the reader on a read-only page
   wondering why their admin link did nothing.
   =========================================================================== */

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

/* ---------------------------------------------------------- preview states */

/**
 * `?preview=<phase>` — the same escape hatch, and the same gate, W8 declared
 * for the fixture itself (PROGRESS §1): dead code in any production build,
 * because Turbopack inlines both halves of this expression to a literal
 * `false` and the minifier deletes every branch behind it.
 *
 * It exists because three of this route's six states are unreachable from a
 * browser. `ended` needs the organiser to delete the document while you are
 * watching it; `denied` needs a Firestore rules rejection; `unavailable` needs
 * the backend to be missing. Every one of them is a screen a stranger can land
 * on, and none of them could be looked at, let alone measured by `audit.mjs`.
 * They were drawn blind for the whole programme, which is exactly how
 * "Firebase Not Configured. Please set up Firebase…" survived to production on
 * a public page.
 *
 * It cannot fabricate content: `ended` still needs a real session to have
 * loaded first, so what it shows is genuinely the last snapshot held.
 */
const DEV_PREVIEW_STATE =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_PREVIEW_SESSION === "1";

type PreviewState = SessionPhase | "stale";

const PREVIEW_STATES: readonly PreviewState[] = [
  "loading",
  "ready",
  "ended",
  "notfound",
  "denied",
  "unavailable",
  "stale",
];

/**
 * The provider's message, read once and discarded.
 *
 * Matching on prose is not elegant, and the alternative — a typed error on
 * `SessionContext` — is a change to a file three workstreams share. The
 * patterns are anchored to the two strings `SessionContext` itself writes
 * ("Session not found", "This session has been ended by the creator.") plus
 * the Firestore permission wording, and anything unrecognised falls to
 * `fault`, which is the safe classification: it keeps the content on screen.
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

  /**
   * The join guard is a REF, and that is not a style preference — it is the
   * fix for a bug this hook shipped with for one round of screenshots.
   *
   * With the guard in state, writing it re-ran the effect, whose cleanup then
   * flipped a `cancelled` flag while `joinSession` was still in flight, so
   * `setSettled(true)` never fired and `/session/<unknown-code>` sat on the
   * loading skeleton forever instead of reaching "No event with that code".
   * A ref is written without a render, so nothing is cancelled and StrictMode's
   * double-invoke still joins exactly once.
   */
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shareCode || !isConfigured || joinedRef.current === shareCode) return;
    joinedRef.current = shareCode;
    /* In a `.finally`, not in the effect body: the point of `settled` is that
       it becomes true only once the lookup has ANSWERED. Setting it
       synchronously would restore the exact flash this hook exists to
       remove. */
    void joinSession(shareCode).finally(() => setSettled(true));
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- `joinSession`
       is recreated whenever the stored-token map changes, which would re-join
       the session mid-watch. The code is the identity of this subscription. */
  }, [shareCode, isConfigured]);

  /* ------------------------------------------------------------- the hold */

  /* Render-time adjustment (React's "adjusting state when a prop changes"),
     not an effect: an effect would paint one frame with the content already
     gone, which is the blank the whole design forbids. */
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
      /* Stripped from the URL immediately — it is already in history and in
         the referrer, and nothing on this screen may make that worse
         (brief risk R5). */
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

  const requested = DEV_PREVIEW_STATE ? searchParams.get("preview") : null;
  const preview = (
    requested && (PREVIEW_STATES as readonly string[]).includes(requested)
      ? requested
      : null
  ) as PreviewState | null;

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
    /* `ended` needs real content behind it, so the override only takes when
       there is a session to keep on screen — otherwise it would prove the
       opposite of what the state claims. */
    phase:
      preview && preview !== "stale" && (preview !== "ended" || view)
        ? preview
        : phase,
    view,
    /* A fault only *matters* while there is something on screen it could be
       lying about. With no content the phase already carries it. */
    faulted: preview === "stale" || (kind === "fault" && Boolean(view)),
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
