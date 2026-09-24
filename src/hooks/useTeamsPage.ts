import { useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { parseTeamNames, type AddedTeams } from "@/lib/roster";
import type { PersistentTeam } from "@/types/game";

export const useTeamsPage = () => {
  const { state, isRosterLoading, rosterError, addTeams, updateTeam, deleteTeam } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<PersistentTeam | null>(null);

  /** Add one team per line of the text, each with a color the roster uses least. */
  const addTeamsFromText = useCallback(
    (text: string): AddedTeams => {
      const { teams, alreadyOnRoster } = parseTeamNames(text, state.teams);
      const added = teams.length > 0 ? addTeams(teams) : [];
      return { added, alreadyOnRoster };
    },
    [state.teams, addTeams]
  );

  const handleEditTeam = useCallback((team: PersistentTeam) => {
    setEditingTeam(team);
    setFormOpen(true);
  }, []);

  const handleDeleteTeam = useCallback(
    (id: string) => {
      deleteTeam(id);
    },
    [deleteTeam]
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
    handleDeleteTeam,
    handleFormSubmit,
  };
};
