"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useTeamsPage } from "@/hooks/useTeamsPage";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PageLoadingSpinner } from "@/components/shared";
import { TeamForm } from "@/components/dialogs/team-form";
import {
  DeleteTeamsDialog,
  TeamInLiveTournamentDialog,
  type KeptTeamRow,
} from "@/components/dialogs/delete-teams";
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
  TeamSelectionBar,
  UpcomingFixturesPanel,
} from "@/components/matchbook/teamPanels";
import type { KeptTeam } from "@/lib/entries";
import { isOffline } from "@/lib/firestoreData";
import type { DeletedTeams } from "@/lib/roster";
import { listNames } from "@/lib/utils";

/** The one line the page shows after a delete. */
const deleteNoticeFor = (outcome: DeletedTeams, nameOf: (id: string) => string): string => {
  const gone =
    outcome.deleted.length === 0
      ? "Nothing deleted."
      : outcome.deleted.length === 1
        ? `Deleted ${nameOf(outcome.deleted[0])}.`
        : `Deleted ${outcome.deleted.length} teams.`;
  if (outcome.kept.length === 0) return gone;
  const kept = listNames(outcome.kept.map((team) => nameOf(team.teamId)));
  return `${gone} Kept ${kept}, still in a live tournament.`;
};

/** A delete waiting on its confirm, with what the dialog says frozen as it was asked. */
interface PendingDelete {
  ids: string[];
  deleting: string[];
  kept: KeptTeamRow[];
}

const nothingPending: PendingDelete = { ids: [], deleting: [], kept: [] };

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
    planDeletion,
    handleDeleteTeams,
    handleFormSubmit,
  } = useTeamsPage();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);

  // Select mode and the delete that follows it. `pending` is the delete
  // waiting on one confirm; `refusal` is what the refusal shows when nothing
  // chosen could go. Each dialog keeps its content while it animates closed,
  // so whether it is open is tracked apart from what it shows.
  const [selectMode, setSelectMode] = useState(false);
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set());
  const [pending, setPending] = useState<PendingDelete>(nothingPending);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refusal, setRefusal] = useState<KeptTeamRow[]>([]);
  const [refusalOpen, setRefusalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState("");

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

  const nameOf = useCallback(
    (id: string) => teams.find((team) => team.id === id)?.name ?? "a team",
    [teams]
  );
  const rowsOf = useCallback(
    (kept: KeptTeam[]): KeptTeamRow[] =>
      kept.map((team) => ({
        teamId: team.teamId,
        name: nameOf(team.teamId),
        tournaments: team.tournaments,
      })),
    [nameOf]
  );

  // Checked ids that are still on the roster; a team deleted elsewhere drops out.
  const checkedIds = useMemo(
    () => [...checked].filter((id) => teams.some((team) => team.id === id)),
    [checked, teams]
  );
  const allShownChecked =
    filteredRows.length > 0 && filteredRows.every((row) => checked.has(row.id));

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

  const toggleSelectMode = useCallback(() => {
    setSelectMode((on) => !on);
    setChecked(new Set());
  }, []);

  const toggleChecked = useCallback((id: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setShownChecked = useCallback(
    (on: boolean) => {
      setChecked((current) => {
        const next = new Set(current);
        for (const row of filteredRows) {
          if (on) next.add(row.id);
          else next.delete(row.id);
        }
        return next;
      });
    },
    [filteredRows]
  );

  // When nothing chosen can go, the refusal says why and points at Withdraw.
  // Otherwise one confirm covers what can go and names what cannot.
  const requestDelete = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const plan = planDeletion(ids);
      if (plan.deletable.length === 0) {
        setRefusal(rowsOf(plan.kept));
        setRefusalOpen(true);
        return;
      }
      setPending({ ids, deleting: plan.deletable.map(nameOf), kept: rowsOf(plan.kept) });
      setConfirmOpen(true);
    },
    [planDeletion, rowsOf, nameOf]
  );

  const confirmDelete = useCallback(async () => {
    if (!confirmOpen || isDeleting) return;
    setIsDeleting(true);
    // Names are looked up now, because the deleted teams are gone from the roster after.
    const names = new Map(teams.map((team) => [team.id, team.name]));
    try {
      const outcome = await handleDeleteTeams(pending.ids);
      setDeleteNotice(deleteNoticeFor(outcome, (id) => names.get(id) ?? "a team"));
      setChecked(new Set());
      setSelectMode(false);
    } catch (error) {
      console.error("Failed to delete teams:", error);
      setDeleteNotice(
        isOffline(error)
          ? "Deleting a team that is in a tournament needs a connection. Try again when you are back online."
          : "The teams could not be deleted. Try again."
      );
    } finally {
      setConfirmOpen(false);
      setIsDeleting(false);
    }
  }, [confirmOpen, pending, isDeleting, teams, handleDeleteTeams]);

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

            {deleteNotice && (
              <p role="status" className="mb-4 text-[0.8rem] font-medium text-mb-ink-muted">
                {deleteNotice}
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
                  headerAction={
                    <button
                      type="button"
                      onClick={toggleSelectMode}
                      className="mb-btn mb-btn-outline-navy px-3 py-1.5 text-[0.72rem]"
                      aria-pressed={selectMode}
                    >
                      <MbIcon id="check" size={13} />
                      {selectMode ? "Done" : "Select"}
                    </button>
                  }
                  strip={
                    selectMode ? (
                      <TeamSelectionBar
                        count={checkedIds.length}
                        shown={filteredRows.length}
                        allChecked={allShownChecked}
                        onSetAll={setShownChecked}
                        onDelete={() => requestDelete(checkedIds)}
                      />
                    ) : (
                      <AddTeamsForm onAdd={handleAddTeams} />
                    )
                  }
                  selection={selectMode ? { checked, onToggle: toggleChecked } : undefined}
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
                  onDelete={() => selectedTeam && requestDelete([selectedTeam.id])}
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

      {/* One confirm for one team or many */}
      <DeleteTeamsDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setConfirmOpen(false);
        }}
        deleting={pending.deleting}
        kept={pending.kept}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />

      {/* Refused: every team chosen is in a live tournament */}
      <TeamInLiveTournamentDialog
        open={refusalOpen}
        onOpenChange={(open) => {
          if (!open) setRefusalOpen(false);
        }}
        kept={refusal}
      />
    </div>
  );
}
