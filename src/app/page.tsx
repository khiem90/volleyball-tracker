"use client";

import { useMemo, useCallback, memo } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Background } from "@/components/Background";
import { useApp } from "@/context/AppContext";
import { Users, Trophy, Zap, Plus, Clock, CheckCircle2, ArrowRight, TrendingUp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription, StatCard } from "@/components/ui/glass-card";

// Memoized stat card wrapper
const StatsGrid = memo(({ 
  teamsCount, 
  activeCount, 
  completedCount, 
  matchesCount 
}: { 
  teamsCount: number; 
  activeCount: number; 
  completedCount: number; 
  matchesCount: number;
}) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 animate-fade-in">
    <StatCard
      icon={<Users className="w-4 h-4" />}
      label="Teams"
      value={teamsCount}
      iconColor="text-primary"
    />
    <StatCard
      icon={<Clock className="w-4 h-4" />}
      label="Active"
      value={activeCount}
      iconColor="text-amber-500"
    />
    <StatCard
      icon={<CheckCircle2 className="w-4 h-4" />}
      label="Done"
      value={completedCount}
      iconColor="text-emerald-500"
    />
    <StatCard
      icon={<TrendingUp className="w-4 h-4" />}
      label="Matches"
      value={matchesCount}
      iconColor="text-sky-500"
    />
  </div>
));
StatsGrid.displayName = "StatsGrid";

// Memoized quick action card
const QuickActionCard = memo(({ 
  href, 
  icon: Icon, 
  title, 
  description, 
  gradientFrom, 
  gradientTo, 
  shadowColor,
  badge 
}: { 
  href: string; 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  description: string;
  gradientFrom: string;
  gradientTo: string;
  shadowColor: string;
  badge?: React.ReactNode;
}) => (
  <Link href={href} className="block group">
    <GlassCard className="h-full">
      <GlassCardHeader className="pb-2">
        <div 
          className={`w-14 h-14 rounded-2xl bg-linear-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg ${shadowColor}`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <GlassCardTitle className="text-xl flex items-center gap-2">
          {title}
          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </GlassCardTitle>
        <GlassCardDescription>
          {description}
          {badge}
        </GlassCardDescription>
      </GlassCardHeader>
    </GlassCard>
  </Link>
));
QuickActionCard.displayName = "QuickActionCard";

// Memoized recent match item
const RecentMatchItem = memo(({ 
  match, 
  homeTeam, 
  awayTeam, 
  homeColor, 
  awayColor 
}: { 
  match: { id: string; homeScore: number; awayScore: number; winnerId?: string; homeTeamId: string; awayTeamId: string }; 
  homeTeam: string; 
  awayTeam: string; 
  homeColor: string; 
  awayColor: string;
}) => {
  const homeWon = match.winnerId === match.homeTeamId;

  return (
    <div className="p-3 rounded-xl bg-accent/20 border border-border/20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div 
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/10"
            style={{ backgroundColor: homeColor }}
          />
          <span className={`truncate text-sm ${homeWon ? "font-semibold text-emerald-400" : "text-muted-foreground"}`}>
            {homeTeam}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 px-3 py-1 rounded-lg bg-background/30">
          <span className={`text-lg font-mono font-bold ${homeWon ? "text-emerald-400" : "text-muted-foreground"}`}>
            {match.homeScore}
          </span>
          <span className="text-xs text-muted-foreground">:</span>
          <span className={`text-lg font-mono font-bold ${!homeWon ? "text-emerald-400" : "text-muted-foreground"}`}>
            {match.awayScore}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className={`truncate text-sm ${!homeWon ? "font-semibold text-emerald-400" : "text-muted-foreground"}`}>
            {awayTeam}
          </span>
          <div 
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/10"
            style={{ backgroundColor: awayColor }}
          />
        </div>
      </div>
    </div>
  );
});
RecentMatchItem.displayName = "RecentMatchItem";

export default function DashboardPage() {
  const { state } = useApp();

  // Memoize filtered data
  const activeCompetitions = useMemo(
    () => state.competitions.filter((c) => c.status === "in_progress"),
    [state.competitions]
  );

  const completedCompetitions = useMemo(
    () => state.competitions.filter((c) => c.status === "completed"),
    [state.competitions]
  );

  const recentMatches = useMemo(
    () => state.matches
      .filter((m) => m.status === "completed")
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, 5),
    [state.matches]
  );

  // Memoize team lookup functions
  const getTeamName = useCallback(
    (teamId: string) => state.teams.find((t) => t.id === teamId)?.name || "Unknown Team",
    [state.teams]
  );

  const getTeamColor = useCallback(
    (teamId: string) => state.teams.find((t) => t.id === teamId)?.color || "#666",
    [state.teams]
  );

  // Memoize match stats calculation
  const getMatchStats = useCallback(
    (competitionId: string) => {
      const compMatches = state.matches.filter(m => m.competitionId === competitionId);
      const completedCount = compMatches.filter(m => m.status === "completed").length;
      const progress = compMatches.length > 0 ? (completedCount / compMatches.length) * 100 : 0;
      return { total: compMatches.length, completed: completedCount, progress };
    },
    [state.matches]
  );

  return (
    <Background variant="default">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 pb-12">
        {/* Hero Section - CSS animation instead of framer-motion */}
        <div className="text-center pt-8 pb-12 animate-fade-in">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-4">
            <span className="text-foreground">Track.</span>{" "}
            <span className="text-primary">Score.</span>{" "}
            <span className="text-foreground">Win.</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Your ultimate volleyball companion. Track scores, manage teams, and organize competitions with ease.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/quick-match">
              <Button size="lg" className="gap-2 btn-orange-gradient text-primary-foreground font-semibold px-8 h-12 rounded-xl">
                <Zap className="w-5 h-5" />
                Quick Match
              </Button>
            </Link>
            <Link href="/competitions/new">
              <Button size="lg" variant="outline" className="gap-2 glass-input hover:bg-accent/30 h-12 rounded-xl px-8">
                <Trophy className="w-5 h-5" />
                New Competition
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Overview - Memoized */}
        <StatsGrid 
          teamsCount={state.teams.length}
          activeCount={activeCompetitions.length}
          completedCount={completedCompetitions.length}
          matchesCount={state.matches.length}
        />

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <QuickActionCard
            href="/quick-match"
            icon={Zap}
            title="Quick Match"
            description="Start a quick match between two teams instantly"
            gradientFrom="from-primary"
            gradientTo="to-amber-500"
            shadowColor="shadow-primary/30"
          />
          <QuickActionCard
            href="/teams"
            icon={Users}
            title="Manage Teams"
            description="Create and organize your teams"
            gradientFrom="from-sky-500"
            gradientTo="to-blue-600"
            shadowColor="shadow-sky-500/30"
            badge={
              <Badge variant="secondary" className="ml-2 bg-sky-500/20 text-sky-400">
                {state.teams.length}
              </Badge>
            }
          />
          <QuickActionCard
            href="/competitions/new"
            icon={Trophy}
            title="New Competition"
            description="Create a tournament, round robin, or league"
            gradientFrom="from-violet-500"
            gradientTo="to-purple-600"
            shadowColor="shadow-violet-500/30"
          />
        </div>

        {/* Active Competitions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Competitions */}
          <GlassCard hover={false}>
            <GlassCardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <GlassCardTitle className="flex items-center gap-2 text-lg">
                  {activeCompetitions.length > 0 && (
                    <span className="live-dot" />
                  )}
                  Live Competitions
                </GlassCardTitle>
                <GlassCardDescription>Competitions in progress</GlassCardDescription>
              </div>
              <Link href="/competitions">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground rounded-xl">
                  View All
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </GlassCardHeader>
            <div className="h-px bg-border/30 mx-5" />
            <GlassCardContent className="pt-4">
              {activeCompetitions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground mb-3">No active competitions</p>
                  <Link href="/competitions/new">
                    <Button variant="outline" size="sm" className="gap-1 rounded-xl glass-input">
                      <Plus className="w-4 h-4" />
                      Create one
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCompetitions.slice(0, 3).map((comp) => {
                    const matchStats = getMatchStats(comp.id);
                    
                    return (
                      <Link
                        key={comp.id}
                        href={`/competitions/${comp.id}`}
                        className="block p-4 rounded-xl bg-accent/20 hover:bg-accent/40 border border-border/20 hover:border-primary/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-amber-500 flex items-center justify-center shadow-md">
                              <Trophy className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold group-hover:text-primary transition-colors">{comp.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {comp.type.replace("_", " ")} • {comp.teamIds.length} teams
                              </p>
                            </div>
                          </div>
                          <Badge className="status-live gap-1">
                            <Play className="w-3 h-3" />
                            Live
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{matchStats.completed}/{matchStats.total} matches</span>
                          </div>
                          <Progress value={matchStats.progress} className="h-1.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          {/* Recent Matches */}
          <GlassCard hover={false}>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Recent Results
              </GlassCardTitle>
              <GlassCardDescription>Latest completed matches</GlassCardDescription>
            </GlassCardHeader>
            <div className="h-px bg-border/30 mx-5" />
            <GlassCardContent className="pt-4">
              {recentMatches.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-muted-foreground mb-3">No matches played yet</p>
                  <Link href="/quick-match">
                    <Button variant="outline" size="sm" className="gap-1 rounded-xl glass-input">
                      <Plus className="w-4 h-4" />
                      Start a match
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentMatches.map((match) => (
                    <RecentMatchItem
                      key={match.id}
                      match={match}
                      homeTeam={getTeamName(match.homeTeamId)}
                      awayTeam={getTeamName(match.awayTeamId)}
                      homeColor={getTeamColor(match.homeTeamId)}
                      awayColor={getTeamColor(match.awayTeamId)}
                    />
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </div>
      </main>
    </Background>
  );
}
