"use client";

/* ===========================================================================
   /session/<shareCode> — THE PUBLIC LIVE SCOREBOARD

   The only screen in this product a stranger ever sees. Someone is handed a
   link at 7pm, opens it on a phone, in a gym, on bad wifi, and has three
   seconds of attention. Everything below is downstream of that.

   LAYOUT ONLY (invariant 23). Every number comes from `useMatchbookSession`,
   every state transition from `useSessionPage`, and every mark from the
   Matchbook kit. What this file was: a `min-h-glassmorphic-header` over a
   competition card, three pastel counters, a fourteen-row table, and — last,
   below all of it, at 24px — the live score.

   ------------------------------------------------------------------ the shell

   `MatchbookShell variant="public"`: no sidebar, no bottom bar, no account
   chip, a brand lockup and the sanctioned `max-w-[1100px]` column. The event's
   own identity rides `MbEventBar`, bled to the column edges and sticky, so the
   name, the format, the code and the connection state stay on screen while a
   reader scrolls a bracket.

   ------------------------------------------------------- the ordering rule

   Live score first, at every width, with nothing above it but one strip of
   state. The reader's own permissions, the connection, and the fact the event
   has ended are all bands directly under the bar — narrow, ruled, and never a
   card at the bottom of the page, which is where the read-only notice used to
   sit ~1,500px below the fold.

   ------------------------------------------------------------ the Suspense

   `useSessionPage` reads `useSearchParams` (the `?admin=` token). Next bails
   the whole route out of prerendering unless that read is inside a
   `<Suspense>`, which `login/page.tsx` already does deliberately and this
   route never did (brief §2.4.7). The boundary is the default export; the
   fallback is the real skeleton, so a bail-out looks like loading rather than
   like nothing.
   =========================================================================== */

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
  /* Two independent pieces of evidence for one fact. `navigator.onLine ===
     false` is certain (no interface, nothing is arriving); a faulted
     subscription is the case `onLine` cannot see, because the interface is up
     and the socket is not. Either one means the numbers below are the last
     ones received, and the page says so rather than removing them. */
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
       session, and for the person running the event that is a foot-gun rather
       than an action. Same rule the shipped header had, kept. */
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
            {/* The share code is the most important string on this page for
                anybody trying to find the event again, so it is set in the
                display face at the strip's own tracking and LABELLED — never a
                `<code>` tag, and never a bare word, because a code like
                "SUMMER" reads as prose without one. */}
            Code{" "}
            <span className="tabular-nums tracking-[0.18em]">
              {session.shareCode}
            </span>
          </>
        }
        status={
          <div className="flex items-center gap-3">
            {(page.role === "creator" || page.role === "admin") && (
              /* NOT `MbBadge`. `.mb-badge` paints its letterforms in
                 `--mb-badge-ink`, which defaults to `--mb-navy` — measured on
                 this strip, the word "Organiser" rendered navy-on-navy and the
                 only thing visible was the neutral tone's 3px bar. The mark
                 and the word here inherit the strip's paper-bright ink, and
                 they are the same crown/shield vocabulary the role band below
                 uses, so one reader sees one symbol for one idea. */
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <MbIcon
                  id={page.role === "creator" ? "crown" : "shield"}
                  size={13}
                  className="shrink-0"
                />
                <span className="matchbook-display text-[0.66rem] font-bold tracking-[0.1em]">
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
          /* ONE action, 48x48. The shipped header stacked three 32px
             `size="sm"` ghosts against a title truncated to 200px; sharing is
             the only thing a stranger ever wants from this bar, and the two
             remaining actions live in the footer where they cost nobody the
             top of the screen. */
          <MbIconButton
            icon="share"
            label="Share this event"
            tone="outline"
            style={MB_ON_NAVY_CONTROL}
            onClick={() => page.setShowShare(true)}
          />
        }
      />

      {/* ONE live status per viewport, and never inside the board's panel head.
          The sticky strip carries it from `sm` up, where it survives a long
          scroll. Below `sm` the strip has room for the name and one 48px
          control and nothing else, so the pill moves to its own full-width
          line here — measured in the panel head instead, "RECONNECTING · Last
          update just now" pushed the head's `justify-between` past its
          measure and broke "ON COURT NOW" across two lines. */}
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

      {/* One panel per grid cell, spans 7/5 and 12 only (invariant 4) — never a
          flex column of panels inside a cell. `.mb-panel` declares
          `height: 100%` so that a panel fills the row it shares, and stacking
          two of them inside one stretched cell made both resolve to 100% of
          the same box: measured on this screen at 1440, the board grew a 350px
          void under a scoreboard that had nothing else to put in it.

          The board is the first cell at every width, so source order and
          reading order are the same and no reader meets the table first. */}
      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Full width, and that is a legibility decision rather than a
            compositional one. `MbScoreboardHero` chooses its own cut from the
            CARD's inline size: at 620px it draws the `1fr auto 1fr` scoreline
            with the numerals between the two crests, and below that it stacks
            one team per row. In a 7-column cell the card measured 572px, so
            the desktop scoreboard was rendering the phone layout. */}
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

        {/* Results before fixtures: a spectator asks "what happened" before
            "what is next", and a result row needs the wider cell because it
            carries a scoreline between the two names. */}
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
