"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { CompetitionCard } from "@/components/CompetitionCard";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trophy } from "lucide-react";
import type { CompetitionStatus } from "@/types/game";

type FilterOption = "all" | CompetitionStatus;

export default function CompetitionsPage() {
  const { state, deleteCompetition } = useApp();
  const [filter, setFilter] = useState<FilterOption>("all");

  const handleDeleteCompetition = useCallback(
    (id: string) => {
      deleteCompetition(id);
    },
    [deleteCompetition]
  );

  const handleFilterChange = useCallback((value: string) => {
    setFilter(value as FilterOption);
  }, []);

  const filteredCompetitions = useMemo(() => {
    const competitions = [...state.competitions].sort((a, b) => b.createdAt - a.createdAt);
    if (filter === "all") return competitions;
    return competitions.filter((c) => c.status === filter);
  }, [state.competitions, filter]);

  const getMatchStats = useCallback(
    (competitionId: string) => {
      const matches = state.matches.filter((m) => m.competitionId === competitionId);
      const completedMatches = matches.filter((m) => m.status === "completed");
      return {
        total: matches.length,
        completed: completedMatches.length,
      };
    },
    [state.matches]
  );

  const getCounts = useMemo(() => ({
    all: state.competitions.length,
    draft: state.competitions.filter(c => c.status === "draft").length,
    in_progress: state.competitions.filter(c => c.status === "in_progress").length,
    completed: state.competitions.filter(c => c.status === "completed").length,
  }), [state.competitions]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">Competitions</h1>
              <Badge variant="secondary" className="text-sm">
                {state.competitions.length}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Manage your tournaments and leagues
            </p>
          </div>
          <Link href="/competitions/new">
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Competition</span>
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        {state.competitions.length > 0 && (
          <Tabs value={filter} onValueChange={handleFilterChange} className="mb-6">
            <TabsList className="bg-card/50 border border-border/40 p-1">
              <TabsTrigger value="all" className="gap-2 data-[state=active]:shadow-md">
                All
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {getCounts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="gap-2 data-[state=active]:shadow-md">
                Active
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {getCounts.in_progress}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="draft" className="gap-2 data-[state=active]:shadow-md">
                Draft
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {getCounts.draft}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2 data-[state=active]:shadow-md">
                Done
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {getCounts.completed}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Competitions List */}
        {state.competitions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-linear-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
              <Trophy className="w-12 h-12 text-violet-500/60" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">No competitions yet</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first competition to organize teams into tournaments, round robins, or leagues.
            </p>
            <Link href="/competitions/new">
              <Button className="gap-2 shadow-lg shadow-primary/20" size="lg">
                <Plus className="w-5 h-5" />
                Create Your First Competition
              </Button>
            </Link>
          </div>
        ) : filteredCompetitions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              No {filter === "all" ? "" : filter.replace("_", " ")} competitions found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCompetitions.map((competition) => {
              const matchStats = getMatchStats(competition.id);
              return (
                <CompetitionCard
                  key={competition.id}
                  competition={competition}
                  teamCount={competition.teamIds.length}
                  matchCount={matchStats.total}
                  completedMatchCount={matchStats.completed}
                  onDelete={handleDeleteCompetition}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
