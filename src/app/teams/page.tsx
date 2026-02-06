"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { TeamCard } from "@/components/TeamCard";
import { TeamForm } from "@/components/dialogs/team-form";
import { QuickAddTeams } from "@/components/QuickAddTeams";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { MotionDiv, StaggerContainer, StaggerItem } from "@/components/motion";
import { EmptyTeams } from "@/components/illustrations";
import { PageLoadingSpinner, EmptyState, DecorativeBackground, PageHeader } from "@/components/shared";
import { useTeamsPage } from "@/hooks/useTeamsPage";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function TeamsPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
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

  if (isLoading || !isAuthenticated) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DecorativeBackground variant="mirrored" />
      <Navigation />

      <main className="relative max-w-6xl mx-auto px-4 pt-8 pb-12">
        <PageHeader
          title="Teams"
          count={teams.length}
          description="Manage your teams for competitions and matches"
          className="mb-8"
          actions={
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
          }
        />

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
          <EmptyState
            illustration={<EmptyTeams className="w-48 h-48 mx-auto mb-6" />}
            title="No teams yet"
            description="Create your first team to start organizing competitions and tracking matches."
            actions={
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
            }
          />
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
            {filteredTeams.map((team, index) => (
              <StaggerItem key={team.id}>
                <TeamCard
                  team={team}
                  onEdit={handleEditTeam}
                  onDelete={handleDeleteTeam}
                  index={index}
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
