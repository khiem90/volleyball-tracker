"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { CompetitionCard } from "@/components/CompetitionCard";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Filter } from "lucide-react";
import type { CompetitionStatus } from "@/types/game";

type FilterOption = "all" | CompetitionStatus;

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
];

export default function CompetitionsPage() {
  const { state, deleteCompetition } = useApp();
  const [filter, setFilter] = useState<FilterOption>("all");

  const handleDeleteCompetition = useCallback(
    (id: string) => {
      deleteCompetition(id);
    },
    [deleteCompetition]
  );

  const handleFilterChange = useCallback((newFilter: FilterOption) => {
    setFilter(newFilter);
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Competitions</h1>
            <p className="text-muted-foreground mt-1">
              Manage your tournaments and leagues
            </p>
          </div>
          <Link href="/competitions/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Competition</span>
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        {state.competitions.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {filterOptions.map((option) => {
              const count =
                option.value === "all"
                  ? state.competitions.length
                  : state.competitions.filter((c) => c.status === option.value).length;

              return (
                <Button
                  key={option.value}
                  variant={filter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange(option.value)}
                  className={`
                    gap-1.5 flex-shrink-0
                    ${filter !== option.value ? "border-border/50 bg-card/50" : ""}
                  `}
                >
                  {option.label}
                  <span
                    className={`
                      px-1.5 py-0.5 text-xs rounded-full
                      ${filter === option.value
                        ? "bg-primary-foreground/20"
                        : "bg-muted"
                      }
                    `}
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
        )}

        {/* Competitions List */}
        {state.competitions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-card/50 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No competitions yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first competition to organize teams into tournaments, round robins, or leagues.
            </p>
            <Link href="/competitions/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
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

