"use client";

import { useState, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { TeamCard } from "@/components/TeamCard";
import { TeamForm } from "@/components/TeamForm";
import { QuickAddTeams } from "@/components/QuickAddTeams";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Plus, Users, Sparkles } from "lucide-react";
import type { PersistentTeam } from "@/types/game";

export default function TeamsPage() {
  const { state, addTeam, updateTeam, deleteTeam } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<PersistentTeam | null>(null);

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

  const sortedTeams = [...state.teams].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
            <p className="text-muted-foreground mt-1">
              Manage your teams for competitions and matches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleQuickAddClick} className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Add</span>
            </Button>
            <Button onClick={handleCreateClick} className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Team</span>
            </Button>
          </div>
        </div>

        {/* Teams Grid */}
        {state.teams.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-card/50 flex items-center justify-center">
              <Users className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No teams yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first team to start organizing competitions and tracking matches.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={handleQuickAddClick} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Quick Add Multiple Teams
              </Button>
              <Button onClick={handleCreateClick} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Single Team
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                onEdit={handleEditTeam}
                onDelete={handleDeleteTeam}
              />
            ))}
          </div>
        )}
      </main>

      {/* Team Form Modal */}
      <TeamForm
        open={formOpen}
        onOpenChange={setFormOpen}
        team={editingTeam}
        onSubmit={handleFormSubmit}
      />

      {/* Quick Add Teams Modal */}
      <QuickAddTeams
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onAddTeams={handleQuickAddTeams}
        existingTeamCount={state.teams.length}
      />
    </div>
  );
}

