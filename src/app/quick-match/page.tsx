"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, Zap, Check, Plus, Shuffle, Swords } from "lucide-react";

export default function QuickMatchPage() {
  const router = useRouter();
  const { state, addTeam, addMatch } = useApp();

  const [homeTeamId, setHomeTeamId] = useState<string>("");
  const [awayTeamId, setAwayTeamId] = useState<string>("");
  const [error, setError] = useState("");

  const availableTeams = state.teams;

  const handleHomeTeamSelect = useCallback((teamId: string) => {
    setHomeTeamId(teamId);
    setError("");
    // If same as away team, clear away team
    if (teamId === awayTeamId) {
      setAwayTeamId("");
    }
  }, [awayTeamId]);

  const handleAwayTeamSelect = useCallback((teamId: string) => {
    setAwayTeamId(teamId);
    setError("");
    // If same as home team, clear home team
    if (teamId === homeTeamId) {
      setHomeTeamId("");
    }
  }, [homeTeamId]);

  const handleRandomSelect = useCallback(() => {
    if (availableTeams.length < 2) {
      setError("Need at least 2 teams for random selection");
      return;
    }

    const shuffled = [...availableTeams].sort(() => Math.random() - 0.5);
    setHomeTeamId(shuffled[0].id);
    setAwayTeamId(shuffled[1].id);
    setError("");
  }, [availableTeams]);

  const handleStartMatch = useCallback(() => {
    if (!homeTeamId || !awayTeamId) {
      setError("Please select both teams");
      return;
    }

    if (homeTeamId === awayTeamId) {
      setError("Please select two different teams");
      return;
    }

    // Create a quick match (no competition)
    addMatch({
      competitionId: null,
      homeTeamId,
      awayTeamId,
      homeScore: 0,
      awayScore: 0,
      status: "pending",
      round: 1,
      position: 1,
    });

    // Get the newly created match ID from state
    // Since addMatch doesn't return the ID, we'll navigate after a tick
    setTimeout(() => {
      const latestMatch = state.matches[state.matches.length - 1];
      if (latestMatch) {
        router.push(`/match/${latestMatch.id}`);
      }
    }, 100);
  }, [homeTeamId, awayTeamId, addMatch, state.matches, router]);

  const handleQuickCreateTeam = useCallback(() => {
    const teamNumber = state.teams.length + 1;
    addTeam(`Team ${teamNumber}`);
  }, [state.teams.length, addTeam]);

  const homeTeam = useMemo(
    () => state.teams.find((t) => t.id === homeTeamId),
    [state.teams, homeTeamId]
  );

  const awayTeam = useMemo(
    () => state.teams.find((t) => t.id === awayTeamId),
    [state.teams, awayTeamId]
  );

  const canStart = homeTeamId && awayTeamId && homeTeamId !== awayTeamId;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Quick Match</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start a quick match between two teams without creating a competition
          </p>
        </div>

        {/* No Teams State */}
        {availableTeams.length < 2 ? (
          <Card className="border-border/40 bg-card/30 text-center">
            <CardContent className="py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-muted/50 flex items-center justify-center">
                <Users className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {availableTeams.length === 0
                  ? "No teams available"
                  : "Need at least 2 teams"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create some teams first to start a quick match.
              </p>
              <Button onClick={handleQuickCreateTeam} variant="outline" className="gap-2" size="lg">
                <Plus className="w-5 h-5" />
                Create Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Team Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Home Team Selection */}
              <Card className="border-border/40 bg-card/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-sky-500" />
                    </div>
                    Home Team
                  </CardTitle>
                  <CardDescription>Select the first team</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                    {availableTeams.map((team) => {
                      const isSelected = team.id === homeTeamId;
                      const isDisabled = team.id === awayTeamId;
                      const teamColor = team.color || "#3b82f6";

                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => handleHomeTeamSelect(team.id)}
                          disabled={isDisabled}
                          className={`
                            w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 
                            ${isSelected
                              ? "bg-primary/10 ring-2 ring-primary shadow-md"
                              : "bg-card hover:bg-accent/50 border border-border/40 hover:border-primary/30"
                            }
                            ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                          `}
                          aria-pressed={isSelected}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-md"
                            style={{
                              background: `linear-gradient(135deg, ${teamColor}, ${teamColor}99)`,
                            }}
                          >
                            <span className="text-sm font-bold text-white">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium truncate flex-1">{team.name}</span>
                          {isSelected && (
                            <Check className="w-5 h-5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Away Team Selection */}
              <Card className="border-border/40 bg-card/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-orange-500" />
                    </div>
                    Away Team
                  </CardTitle>
                  <CardDescription>Select the opponent</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                    {availableTeams.map((team) => {
                      const isSelected = team.id === awayTeamId;
                      const isDisabled = team.id === homeTeamId;
                      const teamColor = team.color || "#f97316";

                      return (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => handleAwayTeamSelect(team.id)}
                          disabled={isDisabled}
                          className={`
                            w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 
                            ${isSelected
                              ? "bg-primary/10 ring-2 ring-primary shadow-md"
                              : "bg-card hover:bg-accent/50 border border-border/40 hover:border-primary/30"
                            }
                            ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                          `}
                          aria-pressed={isSelected}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-md"
                            style={{
                              background: `linear-gradient(135deg, ${teamColor}, ${teamColor}99)`,
                            }}
                          >
                            <span className="text-sm font-bold text-white">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium truncate flex-1">{team.name}</span>
                          {isSelected && (
                            <Check className="w-5 h-5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Match Preview */}
            {(homeTeam || awayTeam) && (
              <Card className="border-border/40 bg-card/30 mb-6 overflow-hidden">
                <div className="h-1 w-full bg-linear-to-r from-sky-500 via-primary to-orange-500" />
                <CardContent className="py-8">
                  <div className="flex items-center justify-center gap-4 md:gap-8">
                    {/* Home Team Preview */}
                    <div className="text-center flex-1">
                      {homeTeam ? (
                        <>
                          <div
                            className="w-20 h-20 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden"
                            style={{
                              background: `linear-gradient(135deg, ${homeTeam.color || "#3b82f6"}, ${homeTeam.color || "#3b82f6"}99)`,
                            }}
                          >
                            <div className="absolute inset-0 bg-white/10" />
                            <span className="text-2xl font-bold text-white relative z-10">
                              {homeTeam.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="font-semibold text-lg">{homeTeam.name}</p>
                          <Badge variant="secondary" className="mt-1">Home</Badge>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center">
                            <Users className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                          <p className="text-muted-foreground">Select team</p>
                        </>
                      )}
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Swords className="w-7 h-7 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">vs</span>
                    </div>

                    {/* Away Team Preview */}
                    <div className="text-center flex-1">
                      {awayTeam ? (
                        <>
                          <div
                            className="w-20 h-20 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden"
                            style={{
                              background: `linear-gradient(135deg, ${awayTeam.color || "#f97316"}, ${awayTeam.color || "#f97316"}99)`,
                            }}
                          >
                            <div className="absolute inset-0 bg-white/10" />
                            <span className="text-2xl font-bold text-white relative z-10">
                              {awayTeam.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p className="font-semibold text-lg">{awayTeam.name}</p>
                          <Badge variant="secondary" className="mt-1">Away</Badge>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center">
                            <Users className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                          <p className="text-muted-foreground">Select team</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-destructive text-center mb-4 font-medium">{error}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                onClick={handleRandomSelect}
                className="gap-2"
                size="lg"
              >
                <Shuffle className="w-5 h-5" />
                Random Teams
              </Button>
              <Button
                onClick={handleStartMatch}
                disabled={!canStart}
                className="gap-2 shadow-xl shadow-primary/25"
                size="lg"
              >
                <Zap className="w-5 h-5" />
                Start Match
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
