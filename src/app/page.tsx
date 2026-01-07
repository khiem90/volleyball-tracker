"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { useApp } from "@/context/AppContext";
import { Users, Trophy, Zap, Plus, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { state } = useApp();

  const activeCompetitions = state.competitions.filter((c) => c.status === "in_progress");
  const completedCompetitions = state.competitions.filter((c) => c.status === "completed");
  const recentMatches = state.matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5);

  const getTeamName = (teamId: string) => {
    return state.teams.find((t) => t.id === teamId)?.name || "Unknown Team";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Welcome to <span className="text-primary">VolleyScore</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Track scores, manage teams, and organize competitions. From quick matches to full tournaments.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Link href="/quick-match" className="group">
            <Card className="h-full border-border/50 bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Quick Match</CardTitle>
                <CardDescription>
                  Start a quick match between two teams instantly
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/teams" className="group">
            <Card className="h-full border-border/50 bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">Manage Teams</CardTitle>
                <CardDescription>
                  Create and organize your teams ({state.teams.length} teams)
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/competitions/new" className="group">
            <Card className="h-full border-border/50 bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl">New Competition</CardTitle>
                <CardDescription>
                  Create a tournament, round robin, or league
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="border-border/50 bg-card/30">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-primary">{state.teams.length}</div>
              <p className="text-sm text-muted-foreground">Total Teams</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/30">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-amber-500">{activeCompetitions.length}</div>
              <p className="text-sm text-muted-foreground">Active Competitions</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/30">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-emerald-500">{completedCompetitions.length}</div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/30">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-500">{state.matches.length}</div>
              <p className="text-sm text-muted-foreground">Total Matches</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Competitions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Competitions */}
          <Card className="border-border/50 bg-card/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Active Competitions
                </CardTitle>
                <CardDescription>Competitions in progress</CardDescription>
              </div>
              <Link href="/competitions">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {activeCompetitions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No active competitions</p>
                  <Link href="/competitions/new">
                    <Button variant="link" className="mt-2">
                      <Plus className="w-4 h-4 mr-1" />
                      Create one
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCompetitions.slice(0, 3).map((comp) => (
                    <Link
                      key={comp.id}
                      href={`/competitions/${comp.id}`}
                      className="block p-3 rounded-lg bg-card hover:bg-card/80 border border-border/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{comp.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {comp.type.replace("_", " ")} • {comp.teamIds.length} teams
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-500 rounded-full">
                          In Progress
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Matches */}
          <Card className="border-border/50 bg-card/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Recent Results
              </CardTitle>
              <CardDescription>Latest completed matches</CardDescription>
            </CardHeader>
            <CardContent>
              {recentMatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No matches played yet</p>
                  <Link href="/quick-match">
                    <Button variant="link" className="mt-2">
                      <Plus className="w-4 h-4 mr-1" />
                      Start a match
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentMatches.map((match) => {
                    const homeTeam = getTeamName(match.homeTeamId);
                    const awayTeam = getTeamName(match.awayTeamId);
                    const homeWon = match.winnerId === match.homeTeamId;

                    return (
                      <div
                        key={match.id}
                        className="p-3 rounded-lg bg-card border border-border/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className={homeWon ? "font-semibold text-emerald-500" : "text-muted-foreground"}>
                            {homeTeam}
                          </span>
                          <span className="text-lg font-bold tabular-nums">
                            {match.homeScore} - {match.awayScore}
                          </span>
                          <span className={!homeWon ? "font-semibold text-emerald-500" : "text-muted-foreground"}>
                            {awayTeam}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
