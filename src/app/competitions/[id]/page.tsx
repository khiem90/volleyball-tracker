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

/* The competition console: five formats through one screen. Layout only —
   display data comes from `useMatchbookCompetitionDetail`, mutations from
   `useCompetitionDetailPage`. The rotation/bracket views stay lazy
   (`next/dynamic`, `ssr: false`) to keep five formats' worth of code out of
   the first bundle. */

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

  /* Coral is reserved for the live state here. `MbAction` has no destructive
   * variant, so "End competition" stays a quiet outline — the destructive
   * treatment lives in `EndCompetitionDialog`. A draft masthead carries no
   * action at all: the only Start button is the coral one in `PreviewPanel`,
   * never a second copy of the same commit. */
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
        /* `venue.Many` is already the plural — pick One/Many, never append
           a suffix ("2 Courtses"). */
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
          {/* Never the raw provider string — `SessionContext.error` is already
              user-facing. "Reconnect" re-joins the same share code through the
              same context path that failed: a real retry, not a page reload. */}
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
        /* Mirrors the auto-session effect's guard (`isSharedMode ||
           !isConfigured`). Read from `useAuth` directly — a read-only prop
           that keeps `useCompetitionDetailPage`'s surface unchanged. */
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
