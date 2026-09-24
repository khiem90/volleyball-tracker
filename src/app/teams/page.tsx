"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useTeamsPage } from "@/hooks/useTeamsPage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PageLoadingSpinner, DeleteConfirmDialog } from "@/components/shared";
import { TeamForm } from "@/components/dialogs/team-form";
import { MatchbookSidebar } from "@/components/matchbook/Sidebar";
import { MatchbookMobileBar } from "@/components/matchbook/MobileBar";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { AddTeamsForm } from "@/components/matchbook/AddTeamsForm";
import { useMatchbookTeams } from "@/components/matchbook/useMatchbookTeams";
import {
  ClubSnapshotPanel,
  RecentFormPanel,
  TeamDirectoryPanel,
  TeamProfilePanel,
  TeamReadinessPanel,
  UpcomingFixturesPanel,
} from "@/components/matchbook/teamPanels";

export default function TeamsPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const { user, isGuest } = useAuth();
  const data = useMatchbookTeams();
  const {
    teams,
    isRosterLoading,
    rosterError,
    formOpen,
    setFormOpen,
    editingTeam,
    addTeamsFromText,
    handleEditTeam,
    handleDeleteTeam,
    handleFormSubmit,
  } = useTeamsPage();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);
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

  // The last team added becomes the selection, and the filter is cleared so
  // its row cannot be hidden.
  const handleAddTeams = useCallback(
    (text: string) => {
      const outcome = addTeamsFromText(text);
      const last = outcome.added.at(-1);
      if (last) {
        setSelectedId(last.id);
        setRevealId(last.id);
        setSearch("");
      }
      return outcome;
    },
    [addTeamsFromText]
  );

  if (isLoading || !isAuthenticated || isRosterLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="matchbook-surface min-h-screen">
      <div className="flex">
        <MatchbookSidebar />

        <div className="min-w-0 flex-1">
          <MatchbookMobileBar
            active="/teams"
            cta={{ href: "/quick-match", label: "Quick Match" }}
          />

          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {/* Masthead */}
            <header className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex items-center gap-4">
                <h1 className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
                  Team <span className="text-mb-coral">Directory</span>
                </h1>
                <div className="flex flex-col items-center border-[2px] border-mb-coral px-2.5 py-1 text-mb-coral">
                  <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">
                    {data.teamCount}
                  </span>
                  <span className="matchbook-display text-[0.6rem] font-bold tracking-[0.28em]">
                    Teams
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p
                    className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em]"
                    suppressHydrationWarning
                  >
                    {data.dateLine}
                  </p>
                  <p className="mb-kicker">
                    {data.matchesCompleted} matches completed
                  </p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-3">
                <Link
                  href="/login"
                  className="hidden items-center gap-2.5 md:flex"
                  title={isGuest ? "Sign in" : user?.email ?? "Account"}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-mb-navy bg-mb-paper-bright">
                    <Image
                      src="/assets/matchbook/brand/crest.svg"
                      alt=""
                      width={24}
                      height={28}
                    />
                  </span>
                  <span className="matchbook-display text-[0.72rem] font-bold leading-tight tracking-[0.08em]">
                    My
                    <br />
                    Account
                  </span>
                  <MbIcon id="chevron-down" size={13} className="text-mb-ink-muted" />
                </Link>
              </div>
            </header>

            {rosterError && (
              <p
                role="alert"
                className="mb-4 border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red"
              >
                {rosterError}
              </p>
            )}

            {/* Panel grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
              <div className="md:col-span-2 xl:col-span-7">
                <TeamDirectoryPanel
                  rows={filteredRows}
                  totalTeams={data.teamCount}
                  selectedId={effectiveId}
                  revealId={revealId}
                  onSelect={setSelectedId}
                  search={search}
                  onSearchChange={setSearch}
                  addForm={<AddTeamsForm onAdd={handleAddTeams} />}
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
          </main>
        </div>
      </div>

      {/* Edit team modal */}
      <TeamForm
        open={formOpen}
        onOpenChange={setFormOpen}
        team={editingTeam}
        onSubmit={handleFormSubmit}
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
    </div>
  );
}
