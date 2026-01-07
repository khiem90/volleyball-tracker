"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { useApp } from "@/context/AppContext";
import { Users, Trophy, Zap, Plus, Clock, CheckCircle2, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

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

  const getTeamColor = (teamId: string) => {
    return state.teams.find((t) => t.id === teamId)?.color || "#666";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="relative mb-12 text-center py-8">
          <div className="absolute inset-0 animated-gradient rounded-3xl opacity-50" />
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Welcome to <span className="text-primary">VolleyScore</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
              Track scores, manage teams, and organize competitions. From quick matches to full tournaments.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/quick-match">
                <Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
                  <Zap className="w-5 h-5" />
                  Quick Match
                </Button>
              </Link>
              <Link href="/competitions/new">
                <Button size="lg" variant="outline" className="gap-2">
                  <Trophy className="w-5 h-5" />
                  New Competition
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Link href="/quick-match" className="group">
            <Card className="h-full border-border/40 bg-card/50 hover:bg-card hover:border-primary/40 transition-all duration-300 card-lift shine-hover">
              <CardHeader className="pb-2">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg shadow-amber-500/20">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Quick Match
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </CardTitle>
                <CardDescription>
                  Start a quick match between two teams instantly
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/teams" className="group">
            <Card className="h-full border-border/40 bg-card/50 hover:bg-card hover:border-primary/40 transition-all duration-300 card-lift shine-hover">
              <CardHeader className="pb-2">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg shadow-sky-500/20">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Manage Teams
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </CardTitle>
                <CardDescription>
                  Create and organize your teams
                  <Badge variant="secondary" className="ml-2">
                    {state.teams.length}
                  </Badge>
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/competitions/new" className="group">
            <Card className="h-full border-border/40 bg-card/50 hover:bg-card hover:border-primary/40 transition-all duration-300 card-lift shine-hover">
              <CardHeader className="pb-2">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg shadow-violet-500/20">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  New Competition
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </CardTitle>
                <CardDescription>
                  Create a tournament, round robin, or league
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <Card className="border-border/40 bg-card/30 overflow-hidden">
            <CardContent className="pt-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Teams</span>
                </div>
                <div className="text-3xl font-bold text-foreground">{state.teams.length}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/40 bg-card/30 overflow-hidden">
            <CardContent className="pt-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</span>
                </div>
                <div className="text-3xl font-bold text-foreground">{activeCompetitions.length}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/40 bg-card/30 overflow-hidden">
            <CardContent className="pt-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Done</span>
                </div>
                <div className="text-3xl font-bold text-foreground">{completedCompetitions.length}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/40 bg-card/30 overflow-hidden">
            <CardContent className="pt-6 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Matches</span>
                </div>
                <div className="text-3xl font-bold text-foreground">{state.matches.length}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Competitions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Competitions */}
          <Card className="border-border/40 bg-card/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Active Competitions
                </CardTitle>
                <CardDescription>Competitions in progress</CardDescription>
              </div>
              <Link href="/competitions">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                  View All
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <Separator className="mb-4" />
            <CardContent>
              {activeCompetitions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground mb-3">No active competitions</p>
                  <Link href="/competitions/new">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="w-4 h-4" />
                      Create one
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCompetitions.slice(0, 3).map((comp) => {
                    const compMatches = state.matches.filter(m => m.competitionId === comp.id);
                    const completedCount = compMatches.filter(m => m.status === "completed").length;
                    const progress = compMatches.length > 0 ? (completedCount / compMatches.length) * 100 : 0;
                    
                    return (
                      <Link
                        key={comp.id}
                        href={`/competitions/${comp.id}`}
                        className="block p-4 rounded-xl bg-card hover:bg-accent/30 border border-border/40 hover:border-primary/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                              <Trophy className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold group-hover:text-primary transition-colors">{comp.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {comp.type.replace("_", " ")} • {comp.teamIds.length} teams
                              </p>
                            </div>
                          </div>
                          <Badge className="status-active">Live</Badge>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{completedCount}/{compMatches.length} matches</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Matches */}
          <Card className="border-border/40 bg-card/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Recent Results
              </CardTitle>
              <CardDescription>Latest completed matches</CardDescription>
            </CardHeader>
            <Separator className="mb-4" />
            <CardContent>
              {recentMatches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground mb-3">No matches played yet</p>
                  <Link href="/quick-match">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="w-4 h-4" />
                      Start a match
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentMatches.map((match) => {
                    const homeTeam = getTeamName(match.homeTeamId);
                    const awayTeam = getTeamName(match.awayTeamId);
                    const homeColor = getTeamColor(match.homeTeamId);
                    const awayColor = getTeamColor(match.awayTeamId);
                    const homeWon = match.winnerId === match.homeTeamId;

                    return (
                      <div
                        key={match.id}
                        className="p-3 rounded-xl bg-card border border-border/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div 
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: homeColor }}
                            />
                            <span className={`truncate text-sm ${homeWon ? "font-semibold text-emerald-500" : "text-muted-foreground"}`}>
                              {homeTeam}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-sm font-mono ${homeWon ? "text-emerald-500 font-bold" : ""}`}>
                              {match.homeScore}
                            </span>
                            <span className="text-xs text-muted-foreground">-</span>
                            <span className={`text-sm font-mono ${!homeWon ? "text-emerald-500 font-bold" : ""}`}>
                              {match.awayScore}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                            <span className={`truncate text-sm ${!homeWon ? "font-semibold text-emerald-500" : "text-muted-foreground"}`}>
                              {awayTeam}
                            </span>
                            <div 
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: awayColor }}
                            />
                          </div>
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
