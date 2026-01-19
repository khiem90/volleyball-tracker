"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { TeamCard } from "@/components/TeamCard";
import { TeamForm } from "@/components/TeamForm";
import { QuickAddTeams } from "@/components/QuickAddTeams";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PlusIcon,
  UserGroupIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { MotionDiv, StaggerContainer, StaggerItem, slideUp } from "@/components/motion";
import { EmptyTeams } from "@/components/illustrations";
import { useTeamsPage } from "@/hooks/useTeamsPage";

export default function TeamsPage() {
  const {
    teams,
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
  } = useTeamsPage();

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="decorative-blob w-150 h-150 -top-48 -left-48 opacity-30" />
        <div className="decorative-blob w-100 h-100 bottom-20 -right-32 opacity-20" />
      </div>

      <Navigation />

      <main className="relative max-w-6xl mx-auto px-4 pb-12">
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
              <Badge variant="secondary" className="text-sm bg-primary/10 text-primary border-primary/20">
                {teams.length}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Manage your teams for competitions and matches
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" onClick={handleQuickAddClick} className="gap-2 rounded-xl">
                <SparklesIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Quick Add</span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={handleCreateClick} variant="teal-gradient" className="gap-2 rounded-xl">
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Add Team</span>
              </Button>
            </motion.div>
          </div>
        </MotionDiv>

        {/* Search Bar */}
        <AnimatePresence>
          {teams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative mb-6"
            >
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl border-border focus:border-primary/50"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Teams Grid */}
        {teams.length === 0 ? (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <EmptyTeams className="w-48 h-48 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-3">No teams yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first team to start organizing competitions and tracking matches.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={handleQuickAddClick} className="gap-2 rounded-xl h-12" size="lg">
                <SparklesIcon className="w-5 h-5" />
                Quick Add Multiple Teams
              </Button>
              <Button onClick={handleCreateClick} variant="teal-gradient" className="gap-2 rounded-xl h-12" size="lg">
                <PlusIcon className="w-5 h-5" />
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
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-accent flex items-center justify-center">
              <MagnifyingGlassIcon className="w-10 h-10 text-muted-foreground/40" />
            </div>
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
        existingTeamCount={teams.length}
      />
    </div>
  );
}
