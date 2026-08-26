"use client";

import { useMemo, useState } from "react";
import { useTeamsPage } from "@/hooks/useTeamsPage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DeleteConfirmDialog } from "@/components/shared";
import {
  TeamForm,
  TEAM_BULK_ADD_LABEL,
  TEAM_CREATE_LABEL,
} from "@/components/dialogs/team-form";
import { QuickAddTeams } from "@/components/QuickAddTeams";
import { MatchbookShell, MB_DEFAULT_CTA } from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { pluralise } from "@/lib/text";
import { useMatchbookTeams } from "@/components/matchbook/useMatchbookTeams";
import {
  MB_XL_SPAN,
  mbClosingSpan,
  MbLedgerPanel,
} from "@/components/matchbook/panels";
import {
  ClubSnapshotPanel,
  MB_TEAM_ADD_ROUTES,
  MB_TEAMS_CONTENTS,
  mbTeamsContentsFor,
  RecentFormPanel,
  TeamDirectoryPanel,
  TeamProfilePanel,
  TeamReadinessPanel,
  UpcomingFixturesPanel,
  type MbTeamsSection,
} from "@/components/matchbook/teamPanels";

/* TEAM DIRECTORY. Coral budget: the rail key (Quick Match) is the one coral
   fill; "New team" is the screen's own primary but takes navy. Two cuts, the
   same two `/` and `/competitions` use: `isFirstRun` (no team exists — two
   ledgers replace six mute panels) and `collapsed` (only the match-fed panels
   are mute — they are withheld and named in one closing index). On a
   populated fixture `muteSections` is empty and all six panels render. */

export default function TeamsPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const data = useMatchbookTeams();
  const {
    teams,
    formOpen,
    setFormOpen,
    quickAddOpen,
    setQuickAddOpen,
    editingTeam,
    handleCreateClick,
    handleQuickAddClick,
    handleEditTeam,
    handleDeleteTeam,
    handleFormSubmit,
    handleQuickAddTeams,
  } = useTeamsPage();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filteredRows = useMemo(
    () =>
      data.rows.filter((row) =>
        row.team.name.toLowerCase().includes(search.toLowerCase())
      ),
    [data.rows, search]
  );

  // Selection is derived: the user's pick while it exists, else the top row.
  const effectiveId =
    selectedId && data.rows.some((row) => row.id === selectedId)
      ? selectedId
      : data.rows[0]?.id ?? null;
  const selectedRow = data.rows.find((row) => row.id === effectiveId) ?? null;
  const selectedTeam = teams.find((team) => team.id === effectiveId) ?? null;

  if (isLoading || !isAuthenticated) {
    return <MbPageLoading active="/teams" />;
  }

  /* Arms at TWO mute panels, never one — a single empty panel beside
     populated ones renders its own `PanelEmpty`. */
  const collapsed = data.muteSections.length >= 2;
  const kept = (key: MbTeamsSection) =>
    !collapsed || !data.muteSections.includes(key);

  /* Upcoming Fixtures (4) and Recent Form (3) close the second row against the
     Team Profile (5). Withhold either and the row is left with a hole, so the
     index takes whatever the last row still owes — 7 when both are gone. */
  const keptSpans = [
    7,
    5,
    5,
    kept("fixtures") && 4,
    kept("form") && 3,
  ].filter((span): span is number => span !== false);

  return (
    <MatchbookShell
      active="/teams"
      cta={MB_DEFAULT_CTA}
      masthead={{
        title: (
          <>
            Team <span className="text-mb-coral">Directory</span>
          </>
        ),
        shortTitle: "Teams",
        /* `pluralise`, not a hardcoded "Teams" — a hardcoded label reads
           "1 TEAMS". */
        badge: {
          value: data.teamCount,
          label: pluralise("Team", data.teamCount),
        },
        dateLine: data.dateLine,
        subLine: data.subLine,
        actions: [
          {
            label: TEAM_CREATE_LABEL,
            icon: "plus",
            variant: "navy",
            onClick: handleCreateClick,
          },
          {
            label: TEAM_BULK_ADD_LABEL,
            icon: "import",
            variant: "outline-navy",
            onClick: handleQuickAddClick,
          },
        ],
      }}
    >
      {data.isFirstRun ? (
        /* First run: two panels, no controls — the masthead already carries
           "New team" and "Quick Add". */
        <div className="mb-enter-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="md:col-span-2 xl:col-span-7">
            <MbLedgerPanel
              title="What This Page Becomes"
              rows={MB_TEAMS_CONTENTS}
              meta={
                <span className="mb-kicker tabular-nums">
                  {MB_TEAMS_CONTENTS.length} Sections
                </span>
              }
            />
          </div>
          <div className="md:col-span-2 xl:col-span-5">
            <MbLedgerPanel
              title="Ways to Add Teams"
              rows={MB_TEAM_ADD_ROUTES}
              meta={
                <span className="mb-kicker tabular-nums">
                  {MB_TEAM_ADD_ROUTES.length} Routes
                </span>
              }
              dense
            />
          </div>
        </div>
      ) : (
        <div className="mb-enter-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <div className="md:col-span-2 xl:col-span-7">
            <TeamDirectoryPanel
              rows={filteredRows}
              totalTeams={data.teamCount}
              selectedId={effectiveId}
              onSelect={setSelectedId}
              search={search}
              onSearchChange={setSearch}
            />
          </div>
          <div className="md:col-span-2 xl:col-span-5 flex flex-col gap-4">
            <ClubSnapshotPanel stats={data.snapshot} />
            <div className="flex-1">
              <TeamReadinessPanel rows={data.readiness} />
            </div>
          </div>
          <div className="md:col-span-2 xl:col-span-5">
            <TeamProfilePanel
              row={selectedRow}
              onEdit={() => selectedTeam && handleEditTeam(selectedTeam)}
              onDelete={() => selectedTeam && setDeleteOpen(true)}
            />
          </div>
          {kept("fixtures") && (
            <div className="xl:col-span-4">
              <UpcomingFixturesPanel items={data.fixtures} />
            </div>
          )}
          {kept("form") && (
            <div className="xl:col-span-3">
              <RecentFormPanel rows={data.recentForm} />
            </div>
          )}
          {/* The withheld panels, as one index that closes the last row
              flush. */}
          {collapsed && (
            <div
              className={`md:col-span-2 ${MB_XL_SPAN[mbClosingSpan(keptSpans)]}`}
            >
              <MbLedgerPanel
                title="Still to Come"
                rows={mbTeamsContentsFor(data.muteSections)}
                dense
                wide
              />
            </div>
          )}
        </div>
      )}

      {/* Create / edit team modal */}
      <TeamForm
        open={formOpen}
        onOpenChange={setFormOpen}
        team={editingTeam}
        onSubmit={handleFormSubmit}
      />

      {/* Bulk add modal */}
      <QuickAddTeams
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onAddTeams={handleQuickAddTeams}
        existingTeamCount={teams.length}
      />

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Team?"
        description={
          selectedRow
            ? `This permanently removes ${selectedRow.team.name} and cannot be undone.`
            : "This permanently removes the team and cannot be undone."
        }
        onConfirm={() => {
          if (effectiveId) handleDeleteTeam(effectiveId);
          setDeleteOpen(false);
        }}
      />
    </MatchbookShell>
  );
}
