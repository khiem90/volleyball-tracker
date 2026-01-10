import { useState, useCallback, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import type { PersistentTeam } from "@/types/game";

export const useTeamsPage = () => {
  const { state, addTeam, updateTeam, deleteTeam } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<PersistentTeam | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateClick = useCallback(() => {
    setEditingTeam(null);
    setFormOpen(true);
  }, []);

  const handleQuickAddClick = useCallback(() => {
    setQuickAddOpen(true);
  }, []);

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
      if (editingTeam) {
        updateTeam(editingTeam.id, name, color);
      } else {
        addTeam(name, color);
      }
    },
    [editingTeam, addTeam, updateTeam]
  );

  const handleQuickAddTeams = useCallback(
    (teams: { name: string; color: string }[]) => {
      teams.forEach((team) => {
        addTeam(team.name, team.color);
      });
    },
    [addTeam]
  );

  const filteredTeams = useMemo(() => {
    return [...state.teams]
      .filter((team) =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [state.teams, searchQuery]);

  return {
    teams: state.teams,
    formOpen,
    setFormOpen,
    quickAddOpen,
    setQuickAddOpen,
    editingTeam,
    searchQuery,
    setSearchQuery,
    filteredTeams,
    handleCreateClick,
    handleQuickAddClick,
    handleEditTeam,
    handleDeleteTeam,
    handleFormSubmit,
    handleQuickAddTeams,
  };
};
