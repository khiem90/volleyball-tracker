"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Background } from "@/components/Background";
import { TeamCard } from "@/components/TeamCard";
import { TeamForm } from "@/components/TeamForm";
import { QuickAddTeams } from "@/components/QuickAddTeams";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Sparkles, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MotionDiv, StaggerContainer, StaggerItem, slideUp } from "@/components/motion";
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
    <Background variant="default">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 pb-12">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
              <Badge variant="secondary" className="text-sm bg-primary/20 text-primary">
                {state.teams.length}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Manage your teams for competitions and matches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" onClick={handleQuickAddClick} className="gap-2 rounded-xl glass-input">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Quick Add</span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={handleCreateClick} className="gap-2 btn-orange-gradient rounded-xl">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Team</span>
              </Button>
            </motion.div>
          </div>
        </MotionDiv>

        {/* Search Bar */}
        <AnimatePresence>
          {state.teams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative mb-6"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-xl glass-input border-border/30 focus:border-primary/50"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Teams Grid */}
        {state.teams.length === 0 ? (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-linear-to-br from-sky-500/20 to-blue-600/20 flex items-center justify-center">
              <Users className="w-12 h-12 text-sky-500/60" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">No teams yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first team to start organizing competitions and tracking matches.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={handleQuickAddClick} className="gap-2 rounded-xl glass-input h-12" size="lg">
                <Sparkles className="w-5 h-5" />
                Quick Add Multiple Teams
              </Button>
              <Button onClick={handleCreateClick} className="gap-2 btn-orange-gradient rounded-xl h-12" size="lg">
                <Plus className="w-5 h-5" />
                Create Single Team
              </Button>
            </div>
          </MotionDiv>
        ) : filteredTeams.length === 0 ? (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground">
              No teams match &quot;{searchQuery}&quot;
            </p>
          </MotionDiv>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map((team) => (
              <StaggerItem key={team.id}>
                <TeamCard
                  team={team}
                  onEdit={handleEditTeam}
                  onDelete={handleDeleteTeam}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
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
    </Background>
  );
}
