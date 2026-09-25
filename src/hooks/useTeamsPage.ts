import { useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { planTeamDeletion, type TeamDeletionPlan } from "@/lib/entries";
import type { DeletedTeams } from "@/lib/roster";
import type { PersistentTeam } from "@/types/game";

export const useTeamsPage = () => {
  const { state, isRosterLoading, rosterError, addTeamsFromText, updateTeam, deleteTeams } =
    useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<PersistentTeam | null>(null);

  const handleEditTeam = useCallback((team: PersistentTeam) => {
    setEditingTeam(team);
    setFormOpen(true);
  }, []);

  /**
   * What deleting these teams would do, judged from the tournaments this page
   * can see: which go, which a live tournament keeps back, and which drafts
   * lose an entry. The write checks again against the stored tournaments.
   */
  const planDeletion = useCallback(
    (ids: string[]): TeamDeletionPlan => planTeamDeletion(ids, state.tournaments),
    [state.tournaments]
  );

  const handleDeleteTeams = useCallback(
    (ids: string[]): Promise<DeletedTeams> => deleteTeams(ids),
    [deleteTeams]
  );

  const handleFormSubmit = useCallback(
    (name: string, color: string) => {
      if (editingTeam) updateTeam(editingTeam.id, name, color);
    },
    [editingTeam, updateTeam]
  );

  return {
    teams: state.teams,
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
  };
};
