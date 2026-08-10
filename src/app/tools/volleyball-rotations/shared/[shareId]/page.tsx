"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbButton, MbButtonLink } from "@/components/matchbook/Button";
import { MbEmptyState } from "@/components/matchbook/EmptyState";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbNotice } from "@/components/matchbook/Notice";
import { MbSkeleton } from "@/components/matchbook/Skeleton";
import { Panel } from "@/components/matchbook/Panel";
import { COURT_ASPECT } from "@/components/matchbook/court/geometry";
import {
  CourtStage,
  OnCourtPanel,
  RotationFacts,
  RotationLayers,
  RotationRail,
} from "@/components/volleyball";
import { useUserFormations } from "@/hooks/useUserFormations";
import { useVolleyballRotation } from "@/hooks/useVolleyballRotation";
import {
  getFormationByShareId,
  type ShareLookupFailure,
} from "@/lib/volleyball/userFormations";
import {
  getFrontRowAttackerCount,
  isSetterFrontRow,
} from "@/lib/volleyball/rotations";
import type { UserFormation } from "@/lib/volleyball/types";

/* ===========================================================================
   PUBLIC FORMATION VIEWER

   A link a coach sends to a parent, so it takes `variant="public"`: brand
   lockup, no sidebar, no bottom bar, no account chip — the same shell
   `/summary/[shareCode]` uses.

   THE FAILURE STATES ARE NOW THREE, NOT ONE. Every thrown error used to land on
   the same centred "Formation Not Found" sentence, including a network timeout
   and — worse — a missing Firestore composite index. `getFormationByShareId`
   filters on `shareId` AND `visibility`, which needs an index on
   (`shareId`, `visibility`); without it production throws `failed-precondition`
   and every visitor was told the owner had un-shared the link. Each cause now
   gets its own copy, and only the recoverable ones get a Retry.

   COPYING DOES NOT REDIRECT. It used to navigate away 1.5s after the copy
   landed, which takes the page out from under a reader who wanted to keep
   looking at the diagram. It confirms in place and offers the archive as a
   link.
   =========================================================================== */

const FAILURE_COPY: Record<
  ShareLookupFailure,
  { tone: "notfound" | "offline" | "error"; title: string; body: string; retry: boolean }
> = {
  notfound: {
    tone: "notfound",
    title: "This formation is not shared",
    body: "The link may have been revoked by its owner, or it may never have existed. Ask them for a fresh link.",
    retry: false,
  },
  offline: {
    tone: "offline",
    title: "The formation could not be reached",
    body: "The connection to the formation store timed out. The link is probably fine — try again in a moment.",
    retry: true,
  },
  unindexed: {
    tone: "error",
    title: "Shared formations are temporarily unavailable",
    body: "The lookup this link needs is not available right now. This is a fault on our side, not a problem with the link.",
    retry: true,
  },
  error: {
    tone: "error",
    title: "The formation could not be loaded",
    body: "Something went wrong reading this link. Trying again usually clears it.",
    retry: true,
  },
};

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** Loading, at the FINAL geometry: masthead block, court box, legend rows. */
const ViewerSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
    <div className="xl:col-span-7">
      <Panel title="Formation">
        <div className="p-4">
          <MbSkeleton w="100%" h={12} className="mb-3" />
          <div className="mb-skeleton w-full" style={{ aspectRatio: COURT_ASPECT }} />
        </div>
      </Panel>
    </div>
    <div className="xl:col-span-5">
      <Panel title="On Court">
        <div className="flex flex-col gap-3 p-4">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <MbSkeleton key={index} w="100%" h={34} />
          ))}
        </div>
      </Panel>
    </div>
  </div>
);

export default function SharedFormationPage() {
  const params = useParams();
  const shareId = typeof params.shareId === "string" ? params.shareId : "";

  const { duplicate, isAuthenticated } = useUserFormations();

  /**
   * ONE piece of state for the whole fetch, tagged with the request that
   * produced it, and `isLoading` derived from whether the tag matches the
   * request the render wants.
   *
   * The obvious shape — three `useState`s and `setIsLoading(true)` at the top of
   * the effect — is a cascading render (React's own `set-state-in-effect` rule
   * rejects it) and it has a real bug in it: pressing Retry sets loading in a
   * second commit, so for one frame the page shows the previous FAILURE with a
   * retry that appears not to have done anything.
   */
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${shareId}#${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    formation: UserFormation | null;
    failure: ShareLookupFailure | null;
  } | null>(null);

  const isLoading = Boolean(shareId) && result?.key !== requestKey;
  const formation = result?.key === requestKey ? result.formation : null;
  const failure = result?.key === requestKey ? result.failure : null;
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">(
    "idle"
  );

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showOverlaps, setShowOverlaps] = useState(true);
  const [showArrows, setShowArrows] = useState(true);

  useEffect(() => {
    if (!shareId) return;
    let cancelled = false;
    getFormationByShareId(shareId).then((lookup) => {
      if (!cancelled) setResult({ key: requestKey, ...lookup });
    });
    return () => {
      cancelled = true;
    };
  }, [shareId, requestKey]);

  const rotation = useVolleyballRotation({
    customFormationData: formation?.data ?? null,
  });

  const handleCopy = useCallback(async () => {
    if (!formation) return;
    setCopyState("copying");
    try {
      await duplicate(formation);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }, [formation, duplicate]);

  if (isLoading) {
    return (
      <MatchbookShell
        variant="public"
        masthead={{
          title: "Shared Formation",
          shortTitle: "Shared Formation",
          badge: { lines: ["Shared", "Formation"] },
        }}
      >
        <ViewerSkeleton />
      </MatchbookShell>
    );
  }

  if (!shareId || failure || !formation) {
    const copy = FAILURE_COPY[failure ?? "notfound"];
    return (
      <MatchbookShell variant="public">
        <MbEmptyState
          tone={copy.tone}
          title={copy.title}
          body={copy.body}
          actions={[
            ...(copy.retry
              ? [{ label: "Try again", onClick: () => setAttempt((n) => n + 1), tone: "coral" as const }]
              : []),
            { label: "Open the rotation designer", href: "/tools/volleyball-rotations" },
          ]}
        />
      </MatchbookShell>
    );
  }

  const tags = formation.tags ?? [];

  return (
    <MatchbookShell
      variant="public"
      masthead={{
        /* The title is user data, so it carries no coral span: the one coral on
           this screen is the copy action, and a two-tone split of somebody
           else's formation name would be an invented emphasis. */
        title: formation.name,
        shortTitle: formation.name,
        badge: { lines: ["Shared", "Formation"] },
        subLine: tags.length > 0 ? tags.join(" · ") : undefined,
      }}
    >
      {formation.description && (
        <p className="mb-4 max-w-[62ch] text-[0.86rem] leading-[1.55] text-mb-ink-muted">
          {formation.description}
        </p>
      )}

      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Panel
            title={`Rotation ${rotation.rotation} · ${
              rotation.mode === "serving" ? "Serving" : "Receiving"
            }`}
          >
            <RotationRail
              rotation={rotation.rotation}
              mode={rotation.mode}
              onRotationChange={rotation.setRotation}
              onModeChange={rotation.setMode}
              onNext={rotation.nextRotation}
              onPrev={rotation.prevRotation}
            />
            <CourtStage
              players={rotation.players}
              overlaps={rotation.overlaps}
              arrows={rotation.arrows}
              mode={rotation.mode}
              rotation={rotation.rotation}
              selectedPlayer={selectedPlayer}
              onPlayerSelect={setSelectedPlayer}
              showOverlaps={showOverlaps}
              showArrows={showArrows}
            />
            <RotationLayers
              liberoActive={rotation.liberoActive}
              onLiberoToggle={rotation.setLiberoActive}
              showOverlaps={showOverlaps}
              showArrows={showArrows}
              onShowOverlapsChange={setShowOverlaps}
              onShowArrowsChange={setShowArrows}
            />
            <RotationFacts
              setterRow={isSetterFrontRow(rotation.rotation) ? "Front" : "Back"}
              frontRowAttackers={getFrontRowAttackerCount(rotation.rotation)}
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-5">
          <Panel title="Use This Formation">
            <div className="flex flex-col gap-3 p-4">
              {copyState === "failed" && (
                <MbNotice tone="danger">
                  The copy could not be saved. Check your connection and try again.
                </MbNotice>
              )}
              {copyState === "copied" ? (
                <>
                  <p className="flex items-center gap-2 text-[0.82rem] font-semibold">
                    <MbIcon id="check" size={16} className="shrink-0 text-mb-green" />
                    Saved to your archive
                  </p>
                  <p className="text-[0.76rem] leading-snug text-mb-ink-muted">
                    Your copy is independent — editing it does not change the
                    original.
                  </p>
                  <MbButtonLink
                    variant="outline-navy"
                    href="/tools/volleyball-rotations/my-formations"
                    icon="save"
                  >
                    Open In Archive
                  </MbButtonLink>
                </>
              ) : isAuthenticated ? (
                <>
                  <p className="text-[0.78rem] leading-snug text-mb-ink-muted">
                    Take a copy into your own archive and edit it freely. The
                    original is untouched.
                  </p>
                  <MbButton
                    variant="coral"
                    icon="copy"
                    loading={copyState === "copying"}
                    onClick={() => void handleCopy()}
                  >
                    Copy To My Formations
                  </MbButton>
                </>
              ) : (
                <>
                  <p className="text-[0.78rem] leading-snug text-mb-ink-muted">
                    Sign in to keep a copy of this formation and edit it. Viewing
                    it needs no account.
                  </p>
                  <MbButtonLink
                    variant="coral"
                    icon="login"
                    href={`/login?redirect=${encodeURIComponent(
                      `/tools/volleyball-rotations/shared/${shareId}`
                    )}`}
                  >
                    Sign In To Copy
                  </MbButtonLink>
                </>
              )}
            </div>
          </Panel>

          <Panel title="On Court">
            <OnCourtPanel
              players={rotation.players}
              selectedPlayer={selectedPlayer}
              onPlayerSelect={setSelectedPlayer}
            />
          </Panel>

          <Panel title="Record">
            <dl className="flex flex-col">
              <div className="flex items-center justify-between border-b border-mb-rule px-4 py-2">
                <dt className="mb-kicker">Created</dt>
                <dd className="text-[0.78rem] font-semibold tabular-nums" suppressHydrationWarning>
                  {formatDate(formation.createdAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <dt className="mb-kicker">Last updated</dt>
                <dd className="text-[0.78rem] font-semibold tabular-nums" suppressHydrationWarning>
                  {formatDate(formation.updatedAt)}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </MatchbookShell>
  );
}
