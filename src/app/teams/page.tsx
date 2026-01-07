"use client";

import { useState, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { TeamCard } from "@/components/TeamCard";
import { TeamForm } from "@/components/TeamForm";
import { QuickAddTeams } from "@/components/QuickAddTeams";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PersistentTeam } from "@/types/game";

export default function TeamsPage() {
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

  const filteredTeams = [...state.teams]
    .filter((team) => team.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
              <Badge variant="secondary" className="text-sm">
                {state.teams.length}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Manage your teams for competitions and matches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleQuickAddClick} className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Add</span>
            </Button>
            <Button onClick={handleCreateClick} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Team</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {state.teams.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/40"
            />
          </div>
        )}

        {/* Teams Grid */}
        {state.teams.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-linear-to-br from-sky-500/20 to-blue-600/20 flex items-center justify-center">
              <Users className="w-12 h-12 text-sky-500/60" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">No teams yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first team to start organizing competitions and tracking matches.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={handleQuickAddClick} className="gap-2" size="lg">
                <Sparkles className="w-5 h-5" />
                Quick Add Multiple Teams
              </Button>
              <Button onClick={handleCreateClick} className="gap-2 shadow-lg shadow-primary/20" size="lg">
                <Plus className="w-5 h-5" />
                Create Single Team
              </Button>
            </div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              No teams match &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map((team) => (
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
