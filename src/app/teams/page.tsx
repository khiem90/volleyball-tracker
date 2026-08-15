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
import { useMatchbookTeams } from "@/components/matchbook/useMatchbookTeams";
import {
  ClubSnapshotPanel,
  RecentFormPanel,
  TeamDirectoryPanel,
  TeamProfilePanel,
  TeamReadinessPanel,
  UpcomingFixturesPanel,
} from "@/components/matchbook/teamPanels";

/* ===========================================================================
   TEAM DIRECTORY

   Converted onto `MatchbookShell`. The masthead's coral badge caption ("TEAMS"
   at 0.6rem/700) measured 3.26:1 here and on three sibling routes — the D-10
   defect `MatchbookMasthead` fixes centrally by inking the caption navy
   (11.79:1) while the >=24px value and the 2px frame keep their coral, where
   the 3:1 mark floor applies.

   Coral budget: the rail key (Quick Match) is the one coral fill. "New team"
   is the screen's own primary but it takes navy, because a directory's primary
   is not louder than the app's — and two coral fills on one screen is
   invariant 15's exact failure mode.
   =========================================================================== */

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
        badge: { value: data.teamCount, label: "Teams" },
        dateLine: data.dateLine,
        subLine: `${data.matchesCompleted} matches completed`,
        actions: [
          {
            label: TEAM_CREATE_LABEL,
            icon: "plus",
            tone: "navy",
            onClick: handleCreateClick,
          },
          {
            label: TEAM_BULK_ADD_LABEL,
            icon: "import",
            tone: "outline-navy",
            onClick: handleQuickAddClick,
          },
        ],
      }}
    >
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
        <div className="xl:col-span-4">
          <UpcomingFixturesPanel items={data.fixtures} />
        </div>
        <div className="xl:col-span-3">
          <RecentFormPanel rows={data.recentForm} />
        </div>
      </div>

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
