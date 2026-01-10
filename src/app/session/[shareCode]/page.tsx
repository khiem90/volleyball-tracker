"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SessionAuth } from "@/components/SessionAuth";
import { ShareButton } from "@/components/ShareSession";
import { Bracket } from "@/components/Bracket";
import { DoubleBracket } from "@/components/DoubleBracket";
import { Win2OutView } from "@/components/Win2OutView";
import { TwoMatchRotationView } from "@/components/TwoMatchRotationView";
import {
  Crown,
  Shield,
  Eye,
  Loader2,
  Trophy,
  Play,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Home,
  LogOut,
} from "lucide-react";
import { useSessionPage } from "@/hooks/useSessionPage";

export default function SessionPage() {
  const {
    canEdit,
    competition,
    completedMatches,
    error,
    handleLeaveSession,
    handleMatchClick,
    inProgressMatches,
    isConfigured,
    isCreator,
    isLoading,
    matches,
    pendingMatches,
    role,
    session,
    setShowAuth,
    shareCode,
    showAuth,
    standings,
    teams,
    teamsMap,
    user,
  } = useSessionPage();

  // Role badge styling
  const roleIcon = {
    creator: <Crown className="w-3 h-3" />,
    admin: <Shield className="w-3 h-3" />,
    viewer: <Eye className="w-3 h-3" />,
  };

  const roleColor = {
    creator: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    admin: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    viewer: "bg-muted text-muted-foreground",
  };

  // Loading state
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Firebase Not Configured</CardTitle>
            <CardDescription>
              Session sharing requires Firebase to be configured. Please set up Firebase to use this feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full gap-2 cursor-pointer">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    const isEnded = error?.includes("ended");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
              isEnded ? "bg-amber-500/10" : "bg-destructive/10"
            }`}>
              <AlertCircle className={`w-8 h-8 ${isEnded ? "text-amber-500" : "text-destructive"}`} />
            </div>
            <CardTitle>{isEnded ? "Session Ended" : "Session Not Found"}</CardTitle>
            <CardDescription>
              {error || `We couldn't find a session with code "${shareCode}". It may have been deleted or the code is incorrect.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/">
              <Button className="w-full gap-2 cursor-pointer">
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass border-b border-border/40 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-primary" />
                </div>
              </Link>
              <div>
                <h1 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                  {session.name}
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{session.shareCode}</span>
                  <Badge variant="outline" className={`${roleColor[role]} gap-1 text-[10px] px-1.5 py-0`}>
                    {roleIcon[role]}
                    {role}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuth(true)}
                  className="gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              )}
              <ShareButton />
              {/* Leave session button (for non-creators) */}
              {!isCreator && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLeaveSession}
                  className="gap-2 cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Leave</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Competition Info */}
        {competition && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    {competition.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize">
                      {competition.type.replace(/_/g, " ")}
                    </Badge>
                    <Badge
                      variant={
                        competition.status === "completed"
                          ? "default"
                          : competition.status === "in_progress"
                          ? "secondary"
                          : "outline"
                      }
                      className="gap-1"
                    >
                      {competition.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                      {competition.status === "in_progress" && <Play className="w-3 h-3" />}
                      {competition.status === "draft" && <Clock className="w-3 h-3" />}
                      {competition.status}
                    </Badge>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {teams.length} teams
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold">{pendingMatches.length + inProgressMatches.length}</p>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{inProgressMatches.length}</p>
            <p className="text-sm text-muted-foreground">Live</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{completedMatches.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </Card>
        </div>

        {/* Competition-specific Views */}
        {competition && (
          <>
            {/* Bracket for elimination tournaments */}
            {competition.type === "single_elimination" && (
              <Card>
                <CardHeader>
                  <CardTitle>Bracket</CardTitle>
                </CardHeader>
                <CardContent>
                  <Bracket
                    matches={matches.filter((m) => m.competitionId === competition.id)}
                    teams={teams}
                    totalTeams={competition.teamIds.length}
                    onMatchClick={canEdit ? handleMatchClick : undefined}
                  />
                </CardContent>
              </Card>
            )}

            {competition.type === "double_elimination" && (
              <Card>
                <CardHeader>
                  <CardTitle>Bracket</CardTitle>
                </CardHeader>
                <CardContent>
                  <DoubleBracket
                    matches={matches.filter((m) => m.competitionId === competition.id)}
                    teams={teams}
                    totalTeams={competition.teamIds.length}
                    onMatchClick={canEdit ? handleMatchClick : undefined}
                  />
                </CardContent>
              </Card>
            )}

            {/* Round Robin Standings */}
            {competition.type === "round_robin" && standings && (
              <Card>
                <CardHeader>
                  <CardTitle>Standings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">#</th>
                          <th className="text-left py-2 px-2">Team</th>
                          <th className="text-center py-2 px-2">P</th>
                          <th className="text-center py-2 px-2">W</th>
                          <th className="text-center py-2 px-2">L</th>
                          <th className="text-center py-2 px-2">PD</th>
                          <th className="text-center py-2 px-2">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((standing, idx) => {
                          const team = teamsMap.get(standing.teamId);
                          return (
                            <tr key={standing.teamId} className="border-b border-border/50">
                              <td className="py-2 px-2 font-medium">{idx + 1}</td>
                              <td className="py-2 px-2">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: team?.color || "#888" }}
                                  />
                                  {team?.name || "Unknown"}
                                </div>
                              </td>
                              <td className="text-center py-2 px-2">{standing.played}</td>
                              <td className="text-center py-2 px-2 text-emerald-500">{standing.won}</td>
                              <td className="text-center py-2 px-2 text-destructive">{standing.lost}</td>
                              <td className="text-center py-2 px-2">
                                {standing.pointsDiff > 0 ? `+${standing.pointsDiff}` : standing.pointsDiff}
                              </td>
                              <td className="text-center py-2 px-2 font-bold">{standing.competitionPoints}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Win 2 Out View */}
            {competition.type === "win2out" && competition.win2outState && (
                <Win2OutView
                  state={competition.win2outState}
                  teams={teams}
                  matches={matches}
                  onMatchClick={canEdit ? handleMatchClick : undefined}
                />
            )}

            {/* Two Match Rotation View */}
            {competition.type === "two_match_rotation" && competition.twoMatchRotationState && (
                <TwoMatchRotationView
                  state={competition.twoMatchRotationState}
                  teams={teams}
                  matches={matches}
                  onMatchClick={canEdit ? handleMatchClick : undefined}
                />
            )}
          </>
        )}

        {/* Live Matches */}
        {inProgressMatches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Live Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inProgressMatches.map((match) => {
                const homeTeam = teamsMap.get(match.homeTeamId);
                const awayTeam = teamsMap.get(match.awayTeamId);

                return (
                  <div
                    key={match.id}
                    className={`flex items-center justify-between p-4 rounded-xl bg-muted/50 ${
                      canEdit ? "cursor-pointer hover:bg-muted transition-colors" : ""
                    }`}
                    onClick={canEdit ? () => handleMatchClick(match) : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: homeTeam?.color || "#888" }}
                      />
                      <span className="font-medium">{homeTeam?.name || "TBD"}</span>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {match.homeScore} - {match.awayScore}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{awayTeam?.name || "TBD"}</span>
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: awayTeam?.color || "#888" }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Viewer message */}
        {role === "viewer" && (
          <Card className="border-muted">
            <CardContent className="py-4 text-center text-sm text-muted-foreground">
              <Eye className="w-5 h-5 mx-auto mb-2" />
              You{"'"}re viewing this session in read-only mode.
              {!user && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="text-primary hover:underline cursor-pointer"
                    onClick={() => setShowAuth(true)}
                  >
                    Sign in
                  </button>{" "}
                  or enter an admin token to edit scores.
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <SessionAuth
        open={showAuth}
        onOpenChange={setShowAuth}
        onSuccess={() => {}}
      />

    </div>
  );
}

