"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { CompetitionCard } from "@/components/CompetitionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon, TrophyIcon } from "@heroicons/react/24/outline";
import {
  MotionDiv,
  StaggerContainer,
  StaggerItem,
  slideUp,
} from "@/components/motion";
import { EmptyCompetitions } from "@/components/illustrations";
import { useCompetitionsPage } from "@/hooks/useCompetitionsPage";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function CompetitionsPage() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const {
    competitions,
    counts,
    filter,
    filteredCompetitions,
    getMatchStats,
    handleDeleteCompetition,
    handleFilterChange,
  } = useCompetitionsPage();

  // Show loading state while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 pb-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="decorative-blob w-150 h-150 -top-48 -right-48 opacity-30" />
        <div className="decorative-blob w-100 h-100 bottom-20 -left-32 opacity-20" />
      </div>

      <Navigation />

      <main className="relative max-w-6xl mx-auto px-4 pb-12">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Competitions
              </h1>
              <Badge
                variant="secondary"
                className="text-sm bg-primary/10 text-primary border-primary/20"
              >
                {competitions.length}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Manage your tournaments and leagues
            </p>
          </div>
          <Link href="/competitions/new">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="teal-gradient" className="gap-2 rounded-xl">
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">New Competition</span>
              </Button>
            </motion.div>
          </Link>
        </MotionDiv>

        {/* Filter Tabs */}
        <AnimatePresence>
          {competitions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <Tabs value={filter} onValueChange={handleFilterChange}>
                <TabsList className="soft-card p-1.5 h-auto rounded-xl">
                  <TabsTrigger
                    value="all"
                    className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                  >
                    All
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-xs"
                    >
                      {counts.all}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="in_progress"
                    className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                  >
                    Active
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-xs"
                    >
                      {counts.in_progress}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="draft"
                    className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                  >
                    Draft
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-xs"
                    >
                      {counts.draft}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2"
                  >
                    Done
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-xs"
                    >
                      {counts.completed}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Competitions List */}
        {competitions.length === 0 ? (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <EmptyCompetitions className="w-48 h-48 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-3">No competitions yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first competition to organize teams into tournaments,
              round robins, or leagues.
            </p>
            <Link href="/competitions/new">
              <Button
                variant="teal-gradient"
                className="gap-2 rounded-xl h-12"
                size="lg"
              >
                <PlusIcon className="w-5 h-5" />
                Create Your First Competition
              </Button>
            </Link>
          </MotionDiv>
        ) : filteredCompetitions.length === 0 ? (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-accent flex items-center justify-center">
              <TrophyIcon className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground">
              No {filter === "all" ? "" : filter.replace("_", " ")} competitions
              found.
            </p>
          </MotionDiv>
        ) : (
          <StaggerContainer className="grid grid-cols-1 gap-4">
            {filteredCompetitions.map((competition) => {
              const matchStats = getMatchStats(competition.id);
              return (
                <StaggerItem key={competition.id}>
                  <CompetitionCard
                    competition={competition}
                    teamCount={competition.teamIds.length}
                    matchCount={matchStats.total}
                    completedMatchCount={matchStats.completed}
                    onDelete={handleDeleteCompetition}
                  />
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </main>
    </div>
  );
}
