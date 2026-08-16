"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useCompetitionDetailPage } from "@/hooks/useCompetitionDetailPage";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { MbBadge, type MbBadgeTone } from "@/components/matchbook/Badge";
import { MbButton } from "@/components/matchbook/Button";
import { MbLiveStatus } from "@/components/matchbook/LiveStatus";
import { MbNotice } from "@/components/matchbook/Notice";
import { MbShareAction } from "@/components/matchbook/ShareAction";
import { MbSkeletonPanel } from "@/components/matchbook/Loading";
import type { MbAction } from "@/components/matchbook/ActionBar";
import { useMatchbookCompetitionDetail } from "@/components/matchbook/useMatchbookCompetitionDetail";
import { CreateSessionDialog } from "@/components/CreateSessionDialog";
import { AddEntrantsDialog } from "@/components/competition-detail/AddEntrantsDialog";
import { CompetitionNotFound } from "@/components/competition-detail/CompetitionNotFound";
import { EndCompetitionDialog } from "@/components/competition-detail/EndCompetitionDialog";
import { MatchActionDialog } from "@/components/competition-detail/MatchActionDialog";
import { StartCompetitionDialog } from "@/components/competition-detail/StartCompetitionDialog";
import { BracketBody, DraftBody, RoundRobinBody } from "@/components/competition-detail/bodies";
import { EditMatchDialog } from "@/components/dialogs/edit-match";
import { getPlayInMatchCount } from "@/lib/singleElimination";
import { exportMatchesCsv } from "@/lib/exportCsv";
import type { Competition } from "@/types/game";

/* ===========================================================================
   THE COMPETITION CONSOLE

   Five formats through one screen. What this file used to be: a
   `min-h-screen bg-background` with `<Navigation/>`, a `max-w-6xl` centred
   column, a ghost back-link, an inline framer-motion ring spinner, three
   shadcn `<Card>`s and a lucide `<Trophy>` per bracket heading.

   It is layout only now (invariant 23). Every number on the screen is shaped by
   `useMatchbookCompetitionDetail`; every mutation still belongs to
   `useCompetitionDetailPage`, whose auto-complete and auto-session effects are
   byte-identical to before the conversion (charter W4 acceptance 1).

   The four rotation/bracket view components stay lazy (`next/dynamic`,
   `ssr: false`) — behaviour 14 of the brief's must-survive list, and the only
   thing keeping five formats' worth of code out of the first bundle.
   =========================================================================== */

const Win2OutView = dynamic(
  () => import("@/components/Win2OutView").then((mod) => ({ default: mod.Win2OutView })),
  { ssr: false, loading: () => <MbSkeletonPanel rows={3} /> }
);
const TwoMatchRotationView = dynamic(
  () =>
    import("@/components/TwoMatchRotationView").then((mod) => ({
      default: mod.TwoMatchRotationView,
    })),
  { ssr: false, loading: () => <MbSkeletonPanel rows={3} /> }
);

const STATUS_TONE: Record<Competition["status"], MbBadgeTone> = {
  draft: "draft",
  in_progress: "live",
  completed: "final",
};

const STATUS_LABEL: Record<Competition["status"], string> = {
  draft: "Draft",
  in_progress: "Live",
  completed: "Final",
};

/** Short names take the house full stop; long ones would set it adrift. */
const TITLE_STOP_MAX = 22;

export default function CompetitionDetailPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const { isConfigured } = useAuth();
  const page = useCompetitionDetailPage();
  const online = useOnlineStatus();
  const [showAddTeams, setShowAddTeams] = useState(false);

  const data = useMatchbookCompetitionDetail({
    competition: page.competition,
    matches: page.matches,
    teams: page.competitionTeams,
  });

  const competition = page.competition;

  const exportResults = useCallback(() => {
    if (!competition) return;
    const nameOf = (id: string) =>
      page.competitionTeams.find((t) => t.id === id)?.name ?? "Unknown team";
    exportMatchesCsv(
      page.matches
        .filter((m) => m.status === "completed" && !m.isBye)
        .map((m) => ({
          completedAt: m.completedAt ?? null,
          home: nameOf(m.homeTeamId),
          away: nameOf(m.awayTeamId),
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          winner: m.winnerId ? nameOf(m.winnerId) : "",
          competition: competition.name,
        })),
      `${competition.name.replace(/[^\w-]+/g, "-").toLowerCase()}-results.csv`
    );
  }, [competition, page.matches, page.competitionTeams]);

  /**
   * The masthead action set — and what coral is NOT allowed to be.
   *
   * Three things were wrong here and all three spent the screen's accent on
   * something that is not the reader's job:
   *
   *   `Share live`      was the coral primary of a live console. Broadcasting
   *                     is optional and secondary to the event, and the
   *                     masthead renders its actions full-width below `sm`, so
   *                     even in navy it read as a 358x48 slab between the title
   *                     and the live score. It goes back to the outline it had
   *                     before the redesign.
   *   `End competition` was `variant: "coral"` — a terminal, irreversible action
   *                     painted as the house CTA. Charter §2.3 assigns it to
   *                     `MbDestructiveButton`, which `MbAction` cannot express
   *                     (`MbActionVariant = MbButtonVariant` has no danger
   *                     member — register D-16). The quiet outline is the
   *                     nearest honest thing the bar can render, and the
   *                     destructive treatment lives where the commit actually
   *                     happens: `EndCompetitionDialog` → `MbConfirm` →
   *                     `MbDestructiveButton`.
   *   `Start` on draft  rendered coral TWICE on one 1,129px page — here and in
   *                     `PreviewPanel`'s footer. Repainting this one navy did
   *                     not fix it, it disguised it: measured on a four-team
   *                     draft at 390px the reader met "START COMPETITION" navy
   *                     at y=159 and "START COMPETITION" coral at y=337 — the
   *                     SAME WORDS, 178px apart, both in the first viewport,
   *                     in two different colours (346px apart on a bracket
   *                     draft, 915px at 1440). Two paints of one irreversible
   *                     commit is a question — "which one is the real one?" —
   *                     asked at the exact moment the reader is deciding
   *                     whether to commit. There is ONE now, and it is the
   *                     coral in `PreviewPanel`'s foot, because that button
   *                     sits directly beneath the sentence describing what it
   *                     will build. `DraftBody` leads with that panel at every
   *                     width so the pair is on the first screen (measured
   *                     after: y=289 at 390, y=197 at 1440, one button).
   *
   * Net: coral does ONE job on this screen's own chrome — live — against a
   * ceiling of two (rubric 3.4), and a draft masthead carries no action at all
   * rather than a second copy of the screen's only commit.
   */
  const actions = useMemo<MbAction[]>(() => {
    if (!competition) return [];
    if (competition.status === "draft") return [];
    if (competition.status === "in_progress") {
      if (!page.isSharedMode) {
        return page.canEdit
          ? [
              {
                label: "Share live",
                variant: "outline-navy",
                icon: "share",
                onClick: () => page.setShowCreateSession(true),
              },
            ]
          : [];
      }
      return page.isCreator
        ? [
            {
              label: "End competition",
              variant: "outline-navy",
              icon: "check",
              onClick: () => page.setShowEndConfirm(true),
            },
          ]
        : [];
    }
    return [
      {
        label: "Export results",
        variant: "navy",
        icon: "export",
        onClick: exportResults,
      },
    ];
  }, [competition, page, exportResults]);

  if (isLoading || !isAuthenticated) {
    return <MbPageLoading active="/competitions" />;
  }

  if (!competition) {
    return <CompetitionNotFound />;
  }

  const short = competition.name.length <= TITLE_STOP_MAX;
  const venueCount = competition.numberOfCourts ?? 0;

  const bodyProps = {
    data,
    competition,
    canEdit: page.canEdit,
    onSelectMatch: page.handleMatchClick,
    onEditMatch: page.setEditingMatch,
  };

  return (
    <MatchbookShell
      active="/competitions"
      back={{ href: "/competitions", label: "All competitions" }}
      cta={{ href: "/competitions/new", label: "New Competition", icon: "plus" }}
      masthead={{
        title: short ? (
          <>
            {competition.name}
            <span className="text-mb-coral">.</span>
          </>
        ) : (
          competition.name
        ),
        shortTitle: competition.name,
        status: (
          <MbBadge tone={STATUS_TONE[competition.status]} variant="framed" size="md">
            {STATUS_LABEL[competition.status]}
          </MbBadge>
        ),
        /* `venue.Many` is ALREADY the plural — running it through `pluralise`
           produced "2 Courtses". The singular/plural pair comes from
           `useTerminology`, so the choice is which one, never a suffix. */
        dateLine: `${data.typeLabel} • ${competition.teamIds.length} Teams${
          venueCount > 0
            ? ` • ${venueCount} ${venueCount === 1 ? data.venue.One : data.venue.Many}`
            : ""
        }`,
        subLine: `Created ${data.createdDate}`,
        actions,
      }}
    >
      {/* ---------------------------------------------------- state strips */}

      {!online && (
        <div className="mb-4">
          <MbNotice tone="warn" icon="wifi-off" title="You are offline">
            The scores below are the last ones this device saw. They will catch up
            on their own once the connection returns.
          </MbNotice>
        </div>
      )}

      {page.sessionError && (
        <div className="mb-4">
          {/* Never the raw provider string (invariant 28) — `SessionContext`
              exposes `error` and this screen was the only one that never read
              it (brief S9). It also has to offer a way OUT: a `danger` state
              with no control on it is a dead end (rubric 7.4). "Reconnect"
              re-joins the same share code through the same context path that
              failed, so it is a real retry rather than a page reload. */}
          <MbNotice tone="danger" title="Live sync stopped">
            <div className="flex flex-col items-start gap-2">
              <span>
                This device is no longer receiving updates for the shared
                session. Everything below is still correct locally.
              </span>
              {page.canRetrySync && (
                <MbButton
                  variant="outline-navy"
                  size="sm"
                  icon="refresh"
                  loading={page.isRetryingSync}
                  onClick={page.retrySync}
                >
                  Reconnect
                </MbButton>
              )}
            </div>
          </MbNotice>
        </div>
      )}

      {page.isSharedMode && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-mb-navy py-2.5">
          <MbLiveStatus status={online ? "live" : "offline"} />
          {!page.canEdit && (
            <p className="mb-kicker">
              View only — the organiser controls this event.
            </p>
          )}
          <span className="ml-auto">
            <MbShareAction
              as="button"
              variant="outline-navy"
              size="sm"
              url={page.getShareUrl()}
              title={competition.name}
              text={`Follow ${competition.name} live`}
            />
          </span>
        </div>
      )}

      {/* --------------------------------------------------------- the body */}

      {competition.status === "draft" ? (
        <DraftBody
          data={data}
          competition={competition}
          canEdit={page.canEdit}
          teams={page.competitionTeams}
          onAddTeams={() => setShowAddTeams(true)}
          onRemoveTeam={page.handleRemoveTeam}
          onStart={() => page.setShowStartConfirm(true)}
          onDelete={page.handleDeleteCompetition}
        />
      ) : competition.type === "round_robin" ? (
        <RoundRobinBody {...bodyProps} />
      ) : competition.type === "single_elimination" ||
        competition.type === "double_elimination" ? (
        <BracketBody {...bodyProps} matches={page.matches} />
      ) : competition.type === "win2out" && competition.win2outState ? (
        <Win2OutView
          state={competition.win2outState}
          matches={page.matches}
          teams={page.competitionTeams}
          competition={competition}
          onMatchClick={page.handleMatchClick}
        />
      ) : competition.type === "two_match_rotation" &&
        competition.twoMatchRotationState ? (
        <TwoMatchRotationView
          state={competition.twoMatchRotationState}
          matches={page.matches}
          teams={page.competitionTeams}
          competition={competition}
          onMatchClick={page.handleMatchClick}
        />
      ) : (
        <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="xl:col-span-12">
            <MbNotice tone="warn" title="This competition has no schedule">
              The format is {data.typeLabel} but no matches were generated. Deleting
              and recreating the competition is the safest way forward.
            </MbNotice>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ modals */}

      <StartCompetitionDialog
        open={page.showStartConfirm}
        onOpenChange={page.setShowStartConfirm}
        typeLabel={data.typeLabel}
        teamCount={competition.teamIds.length}
        teams={page.competitionTeams}
        competitionType={competition.type}
        playInMatchCount={getPlayInMatchCount(competition.teamIds.length)}
        matchWord={data.matchWord.one}
        /* The auto-session effect's own guard, restated as a prop rather than
           re-derived: `if (isSharedMode || !isConfigured) return`. Read from
           `useAuth` here rather than threaded through `useCompetitionDetailPage`
           so that hook's mutation surface stays exactly as the charter froze it
           (W4 acceptance 1) — this is a read, and the dialog is the only thing
           that needs it. */
        willPublish={!page.isSharedMode && isConfigured}
        onStart={page.handleStartCompetition}
      />

      <MatchActionDialog
        open={!!page.selectedMatch}
        onOpenChange={(open) => !open && page.setSelectedMatch(null)}
        match={page.selectedMatch}
        teams={page.competitionTeams}
        canEdit={page.canEdit}
        venueLabel={
          page.selectedMatch
            ? `Round ${page.selectedMatch.round} · ${data.matchWord.one} ${page.selectedMatch.position}`
            : undefined
        }
        onPlayMatch={page.canEdit ? page.handlePlayMatch : undefined}
        onEditMatch={() =>
          page.selectedMatch && page.setEditingMatch(page.selectedMatch)
        }
      />

      <CreateSessionDialog
        open={page.showCreateSession}
        onOpenChange={page.setShowCreateSession}
        defaultName={competition.name}
        competitionData={{
          competition,
          teams: page.competitionTeams,
          matches: page.matches,
        }}
      />

      <EndCompetitionDialog
        open={page.showEndConfirm}
        onOpenChange={page.setShowEndConfirm}
        isEnding={page.isEndingCompetition}
        competitionName={competition.name}
        onEndCompetition={page.handleEndCompetition}
      />

      <EditMatchDialog
        open={!!page.editingMatch}
        onOpenChange={(open) => !open && page.setEditingMatch(null)}
        match={page.editingMatch}
        matches={page.matches}
        teams={page.competitionTeams}
        competition={competition}
        label={
          page.editingMatch
            ? `Round ${page.editingMatch.round} · ${data.matchWord.one} ${page.editingMatch.position}`
            : undefined
        }
      />

      <AddEntrantsDialog
        open={showAddTeams}
        onOpenChange={setShowAddTeams}
        allTeams={page.allTeams}
        enteredIds={competition.teamIds}
        onConfirm={page.handleAddTeams}
      />
    </MatchbookShell>
  );
}
