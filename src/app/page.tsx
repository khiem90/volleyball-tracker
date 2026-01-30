"use client";

import { memo } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import {
  UserGroupIcon,
  TrophyIcon,
  BoltIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChartBarIcon,
  PlayIcon,
  LockClosedIcon,
  ArrowRightEndOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { TrophyIcon as TrophySolid } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription, StatCard } from "@/components/ui/glass-card";
import { EmptyCompetitions, EmptyMatches } from "@/components/illustrations";
import { useDashboardPage } from "@/hooks/useDashboardPage";
import { useAuth } from "@/context/AuthContext";

// Memoized stat card wrapper - each card gets a different playful color
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
      icon={<UserGroupIcon className="w-4 h-4" />}
      label="Teams"
      value={teamsCount}
      iconColor="text-primary"
      index={0}
    />
    <StatCard
      icon={<ClockIcon className="w-4 h-4" />}
      label="Active"
      value={activeCount}
      iconColor="text-amber-600"
      index={1}
    />
    <StatCard
      icon={<CheckCircleIcon className="w-4 h-4" />}
      label="Done"
      value={completedCount}
      iconColor="text-emerald-600"
      index={2}
    />
    <StatCard
      icon={<ChartBarIcon className="w-4 h-4" />}
      label="Matches"
      value={matchesCount}
      iconColor="text-sky-600"
      index={3}
    />
  </div>
));
StatsGrid.displayName = "StatsGrid";

// Memoized quick action card - more rounded and playful
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
    <GlassCard className="h-full rounded-3xl">
      <GlassCardHeader className="pb-2">
        <div
          className={`w-14 h-14 rounded-2xl bg-linear-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg ${shadowColor}`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <GlassCardTitle className="text-xl flex items-center gap-2 font-bold">
          {title}
          <ArrowRightIcon className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
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
    <div className="p-3 rounded-2xl bg-accent/50 border border-border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: homeColor }}
          />
          <span className={`truncate text-sm ${homeWon ? "font-semibold text-emerald-600" : "text-muted-foreground"}`}>
            {homeTeam}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 px-3 py-1 rounded-xl bg-white shadow-soft-sm border border-border">
          <span className={`text-lg font-mono font-bold ${homeWon ? "text-emerald-600" : "text-muted-foreground"}`}>
            {match.homeScore}
          </span>
          <span className="text-xs text-muted-foreground">:</span>
          <span className={`text-lg font-mono font-bold ${!homeWon ? "text-emerald-600" : "text-muted-foreground"}`}>
            {match.awayScore}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className={`truncate text-sm ${!homeWon ? "font-semibold text-emerald-600" : "text-muted-foreground"}`}>
            {awayTeam}
          </span>
          <div
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: awayColor }}
          />
        </div>
      </div>
    </div>
  );
});
RecentMatchItem.displayName = "RecentMatchItem";

export default function DashboardPage() {
  const { isGuest, user } = useAuth();
  const {
    activeCompetitions,
    completedCompetitions,
    getMatchStats,
    getTeamColor,
    getTeamName,
    matchesCount,
    recentMatches,
    teamsCount,
  } = useDashboardPage();

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="decorative-blob w-150 h-150 -top-48 -right-48 opacity-40" />
        <div className="decorative-blob w-100 h-100 top-1/3 -left-32 opacity-30" />
        <div className="decorative-blob w-75 h-75 bottom-20 right-1/4 opacity-20" />
      </div>

      <Navigation />

      <main className="relative max-w-6xl mx-auto px-4 pb-12">
        {/* Hero Section */}
        <div className="text-center pt-8 pb-12 animate-fade-in">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-4">
            <span className="text-foreground">Track.</span>{" "}
            <span className="text-highlight text-primary">Score.</span>{" "}
            <span className="text-foreground">Win.</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
            {isGuest
              ? "Try a quick match as a guest, or sign in to unlock all features."
              : "Your ultimate tournament companion. Track scores, manage teams, and organize competitions with ease."}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/quick-match">
              <Button size="pill" variant="playful" className="gap-2 px-8">
                <BoltIcon className="w-5 h-5" />
                Quick Match
              </Button>
            </Link>
            {!isGuest && (
              <Link href="/competitions/new">
                <Button size="pill" variant="outline" className="gap-2 px-8">
                  <TrophyIcon className="w-5 h-5" />
                  New Competition
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Overview - Only for authenticated users */}
        {!isGuest && (
          <StatsGrid
            teamsCount={teamsCount}
            activeCount={activeCompetitions.length}
            completedCount={completedCompetitions.length}
            matchesCount={matchesCount}
          />
        )}

        {/* Guest Welcome Banner */}
        {isGuest && (
          <GlassCard hover={false} className="mb-10">
            <GlassCardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg">
                  <TrophySolid className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold mb-1">Welcome, Guest!</h3>
                  <p className="text-muted-foreground">
                    Try a quick match with default teams, or sign in to create custom teams, run tournaments, and save your match history.
                  </p>
                </div>
                <Link href="/login" className="shrink-0">
                  <Button variant="teal-gradient" className="gap-2 rounded-xl">
                    <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <QuickActionCard
            href="/quick-match"
            icon={BoltIcon}
            title="Quick Match"
            description={isGuest ? "Play a quick match with default teams" : "Start a quick match between two teams instantly"}
            gradientFrom="from-primary"
            gradientTo="to-red-400"
            shadowColor="shadow-primary/25"
          />
          <QuickActionCard
            href={isGuest ? "/login?redirect=/teams" : "/teams"}
            icon={UserGroupIcon}
            title="Manage Teams"
            description="Create and organize your teams"
            gradientFrom="from-sky-500"
            gradientTo="to-blue-600"
            shadowColor="shadow-sky-500/25"
            badge={
              !isGuest ? (
                <Badge variant="secondary" className="ml-2 bg-sky-100 text-sky-600 border-sky-200 rounded-full dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800">
                  {teamsCount}
                </Badge>
              ) : undefined
            }
          />
          <QuickActionCard
            href={isGuest ? "/login?redirect=/competitions/new" : "/competitions/new"}
            icon={TrophyIcon}
            title="New Competition"
            description="Create a tournament, round robin, or league"
            gradientFrom="from-violet-500"
            gradientTo="to-purple-600"
            shadowColor="shadow-violet-500/25"
          />
        </div>

        {/* Active Competitions & Recent Activity - Only for authenticated users */}
        {!isGuest && (
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
                  <ArrowRightIcon className="w-3 h-3" />
                </Button>
              </Link>
            </GlassCardHeader>
            <div className="h-px bg-border mx-5" />
            <GlassCardContent className="pt-4">
              {activeCompetitions.length === 0 ? (
                <div className="text-center py-6">
                  <EmptyCompetitions className="w-32 h-32 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-3">No active competitions</p>
                  <Link href="/competitions/new">
                    <Button variant="outline" size="sm" className="gap-1 rounded-xl">
                      <PlusIcon className="w-4 h-4" />
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
                        className="block p-4 rounded-xl bg-accent/50 hover:bg-accent border border-border hover:border-primary/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-red-400 flex items-center justify-center shadow-soft">
                              <TrophySolid className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold group-hover:text-primary transition-colors">{comp.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {comp.type.replace("_", " ")} • {comp.teamIds.length} teams
                              </p>
                            </div>
                          </div>
                          <Badge className="status-live gap-1">
                            <PlayIcon className="w-3 h-3" />
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
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                Recent Results
              </GlassCardTitle>
              <GlassCardDescription>Latest completed matches</GlassCardDescription>
            </GlassCardHeader>
            <div className="h-px bg-border mx-5" />
            <GlassCardContent className="pt-4">
              {recentMatches.length === 0 ? (
                <div className="text-center py-6">
                  <EmptyMatches className="w-32 h-32 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-3">No matches played yet</p>
                  <Link href="/quick-match">
                    <Button variant="outline" size="sm" className="gap-1 rounded-xl">
                      <PlusIcon className="w-4 h-4" />
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
        )}

        {/* Guest Features Preview */}
        {isGuest && (
          <GlassCard hover={false}>
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-lg">
                <LockClosedIcon className="w-5 h-5 text-primary" />
                Unlock Full Features
              </GlassCardTitle>
              <GlassCardDescription>Sign in to access all Tournament Tracker features</GlassCardDescription>
            </GlassCardHeader>
            <div className="h-px bg-border mx-5" />
            <GlassCardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: UserGroupIcon, label: "Custom Teams", description: "Create and manage your teams" },
                  { icon: TrophyIcon, label: "Tournaments", description: "Run brackets and leagues" },
                  { icon: ClockIcon, label: "Match History", description: "Track all your games" },
                  { icon: ChartBarIcon, label: "Statistics", description: "View standings and stats" },
                ].map((feature) => (
                  <div key={feature.label} className="text-center p-4 rounded-xl bg-accent/30">
                    <feature.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="font-medium text-sm">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link href="/login">
                  <Button variant="teal-gradient" size="lg" className="gap-2 rounded-xl">
                    <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
                    Sign In to Unlock
                  </Button>
                </Link>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}
      </main>
    </div>
  );
}
