"use client";

/* /session/<shareCode> — the public live scoreboard, the only screen a
   stranger ever sees. Layout only: data from `useMatchbookSession`, state
   transitions from `useSessionPage`. Live score first at every width; the
   reader's permissions, the connection and "event ended" are narrow bands
   directly under the event bar.

   The Suspense wrapper is required: `useSessionPage` reads `useSearchParams`
   (the `?admin=` token), and Next bails the route out of prerendering unless
   that read sits inside a `<Suspense>`. The fallback is the real skeleton. */

import { Suspense, useState } from "react";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MB_ON_NAVY_CONTROL, MbEventBar } from "@/components/matchbook/EventBar";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbIconButton } from "@/components/matchbook/IconButton";
import { useMatchbookSession } from "@/components/matchbook/useMatchbookSession";
import { SessionAuth } from "@/components/auth";
import {
  SessionEndedBanner,
  SessionRoleBand,
  SessionStaleBanner,
  SessionTokenRejected,
} from "@/components/session/SessionBanners";
import { SessionLiveStatus } from "@/components/session/SessionLiveStatus";
import {
  SessionBoard,
  SessionBracket,
  SessionCounts,
  SessionFooter,
  SessionLedger,
  SessionQueue,
  SessionStandings,
} from "@/components/session/SessionPanels";
import { SessionShareDialog } from "@/components/session/SessionShareDialog";
import { SessionSkeleton } from "@/components/session/SessionSkeleton";
import {
  SessionDenied,
  SessionNotFound,
  SessionUnavailable,
} from "@/components/session/SessionStates";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSessionPage } from "@/hooks/useSessionPage";

/** The strip is bled to the column edges and sits flush under the lockup. */
const EVENT_BAR_BLEED = "-mx-4 -mt-5 mb-4 sm:-mx-6 lg:-mx-8";

const SessionView = () => {
  const page = useSessionPage();
  const view = useMatchbookSession({ session: page.view });
  const online = useOnlineStatus();
  const [roleBandHidden, setRoleBandHidden] = useState(false);

  const session = page.view;
  const ended = page.phase === "ended";
  /* Two independent signals for one fact: `!online` is certain, and a faulted
     subscription is the case `onLine` cannot see (interface up, socket down).
     Either way the numbers below are the last ones received, and the page
     says so rather than removing them. */
  const stale = page.faulted || !online;

  /* ------------------------------------------------------- state-only routes */

  if (page.phase === "loading") {
    return (
      <MatchbookShell variant="public">
        <SessionSkeleton />
      </MatchbookShell>
    );
  }

  if (page.phase === "notfound" || !session) {
    return (
      <MatchbookShell variant="public">
        <SessionNotFound shareCode={page.shareCode} />
      </MatchbookShell>
    );
  }

  if (page.phase === "denied") {
    return (
      <MatchbookShell variant="public">
        <SessionDenied />
      </MatchbookShell>
    );
  }

  if (page.phase === "unavailable") {
    return (
      <MatchbookShell variant="public">
        <SessionUnavailable onRetry={page.retry} />
      </MatchbookShell>
    );
  }

  /* -------------------------------------------------------------- the event */

  const footerActions = [
    ...(page.canEdit
      ? []
      : [
          {
            label: "I can score this event",
            icon: "key",
            onClick: () => page.setShowAuth(true),
          },
        ]),
    /* The creator never sees "stop watching": leaving clears the stored
       session, a foot-gun for the person running the event. */
    ...(page.isCreator
      ? []
      : [{ label: "Stop watching", icon: "logout", onClick: page.leave }]),
  ];

  return (
    <MatchbookShell variant="public">
      <MbEventBar
        className={EVENT_BAR_BLEED}
        title={session.name}
        kicker={
          <>
            {view.metaLine}
            {view.metaLine && " · "}
            {/* The share code is always labelled — a code like "SUMMER" reads
                as prose without the "Code" prefix. */}
            Code{" "}
            <span className="tabular-nums">
              {session.shareCode}
            </span>
          </>
        }
        status={
          <div className="flex items-center gap-3">
            {(page.role === "creator" || page.role === "admin") && (
              /* NOT `MbBadge`: `.mb-badge` inks its letterforms in
                 `--mb-badge-ink` (navy), which is invisible on this navy
                 strip. The mark inherits the strip's paper-bright ink and
                 reuses the role band's crown/shield vocabulary. */
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <MbIcon
                  id={page.role === "creator" ? "crown" : "shield"}
                  size={13}
                  className="shrink-0"
                />
                <span className="matchbook-display text-[0.66rem] mb-track-status font-bold">
                  {page.role === "creator" ? "Organiser" : "Scorer"}
                </span>
              </span>
            )}
            <span className="hidden sm:block">
              <SessionLiveStatus
                version={session.updatedAt}
                faulted={stale}
                ended={ended}
                tone="paper"
              />
            </span>
          </div>
        }
        actions={
          /* One action only: sharing is the only thing a stranger wants from
             this bar; the other actions live in the footer. */
          <MbIconButton
            icon="share"
            label="Share this event"
            variant="outline"
            style={MB_ON_NAVY_CONTROL}
            onClick={() => page.setShowShare(true)}
          />
        }
      />

      {/* One live status per viewport, never inside the board's panel head
          (a long status there breaks the head across two lines). The sticky
          strip carries it from `sm` up; below `sm` it gets its own line. */}
      <div className="mb-3 flex sm:hidden">
        <SessionLiveStatus
          version={session.updatedAt}
          faulted={stale}
          ended={ended}
          tone="navy"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3">
        {ended && <SessionEndedBanner />}
        {!ended && stale && (
          <SessionStaleBanner offline={!online} onRetry={page.retry} />
        )}
        {page.tokenRejected && (
          <SessionTokenRejected onDismiss={page.dismissTokenNotice} />
        )}
        {!ended && !roleBandHidden && (
          <SessionRoleBand
            role={page.role}
            onSignIn={() => page.setShowAuth(true)}
            onDismiss={() => setRoleBandHidden(true)}
          />
        )}
      </div>

      {/* One panel per grid cell, never a flex column of panels inside a
          cell: `.mb-panel` declares `height: 100%`, so two stacked in one
          stretched cell both resolve to 100% of the same box and grow voids.
          The board is the first cell at every width. */}
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Full width for legibility: `MbScoreboardHero` picks its layout
            from the card's inline size, and in a 7-column cell the desktop
            scoreboard renders the phone layout. */}
        <div className="min-w-0 xl:col-span-12">
          <SessionBoard
            view={view}
            canEdit={page.canEdit && !ended}
            ended={ended}
            onOpenMatch={page.openMatch}
          />
        </div>

        <div className="min-w-0 xl:col-span-12">
          <SessionCounts view={view} ended={ended} />
        </div>

        {view.format === "round_robin" && (
          <div className="min-w-0 xl:col-span-12">
            <SessionStandings view={view} caption={session.name} />
          </div>
        )}

        {(view.format === "single_elimination" ||
          view.format === "double_elimination") && (
          <div className="min-w-0 xl:col-span-12">
            <SessionBracket
              view={view}
              canEdit={page.canEdit && !ended}
              onOpenMatch={page.openMatch}
            />
          </div>
        )}

        {view.queue && (
          <div className="min-w-0 xl:col-span-12">
            <SessionQueue entries={view.queue} venueWord={view.venueWord} />
          </div>
        )}

        {/* Results before fixtures; the result row takes the wider cell
            because it carries a scoreline between the names. */}
        <div className="min-w-0 xl:col-span-7">
          <SessionLedger
            title="Latest results"
            icon="history"
            lines={view.latest}
            variant="result"
            canEdit={page.canEdit && !ended}
            onOpenMatch={page.openMatch}
            emptyMessage="No results yet — the first finished match appears here."
          />
        </div>

        <div className="min-w-0 xl:col-span-5">
          <SessionLedger
            title="Next up"
            icon="calendar"
            lines={view.nextUp}
            variant="schedule"
            canEdit={page.canEdit && !ended}
            onOpenMatch={page.openMatch}
            emptyMessage="Nothing left to play — every fixture in this event has been scored."
          />
        </div>
      </div>

      <SessionFooter shareCode={session.shareCode} actions={footerActions} />

      <SessionShareDialog
        open={page.showShare}
        onOpenChange={page.setShowShare}
        eventName={session.name}
        shareCode={session.shareCode}
        shareUrl={page.shareUrl}
        adminShareUrl={page.adminShareUrl}
        role={page.role}
        storyLine={view.storyLine}
      />

      <SessionAuth
        open={page.showAuth}
        onOpenChange={page.setShowAuth}
        dismissLabel="Keep watching"
      />
    </MatchbookShell>
  );
};

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <MatchbookShell variant="public">
          <SessionSkeleton />
        </MatchbookShell>
      }
    >
      <SessionView />
    </Suspense>
  );
}
