"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { CompetitionCard } from "@/components/CompetitionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { MotionDiv, StaggerContainer, StaggerItem } from "@/components/motion";
import { EmptyCompetitions } from "@/components/illustrations";
import { PageLoadingSpinner, EmptyState, DecorativeBackground, PageHeader } from "@/components/shared";
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

  if (isLoading || !isAuthenticated) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DecorativeBackground />
      <Navigation />

      <main className="relative max-w-6xl mx-auto px-4 pt-8 pb-12">
        <PageHeader
          title="Competitions"
          count={competitions.length}
          description="Manage your tournaments and leagues"
          actions={
            <Link href="/competitions/new">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="teal-gradient" className="gap-2 rounded-xl">
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">New Competition</span>
                </Button>
              </motion.div>
            </Link>
          }
        />

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
          <EmptyState
            illustration={<EmptyCompetitions className="w-48 h-48 mx-auto mb-6" />}
            title="No competitions yet"
            description="Create your first competition to organize teams into tournaments, round robins, or leagues."
            actions={
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
            }
          />
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
