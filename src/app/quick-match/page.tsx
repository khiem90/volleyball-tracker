"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Background } from "@/components/Background";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card";
import { MotionDiv, slideUp, springSmooth } from "@/components/motion";
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
    if (teamId === awayTeamId) {
      setAwayTeamId("");
    }
  }, [awayTeamId]);

  const handleAwayTeamSelect = useCallback((teamId: string) => {
    setAwayTeamId(teamId);
    setError("");
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
    <Background variant="default">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 pb-12">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="text-center mb-10"
        >
          <motion.div 
            className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-linear-to-br from-primary to-amber-500 flex items-center justify-center shadow-2xl shadow-primary/40"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Zap className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Quick Match</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start a quick match between two teams without creating a competition
          </p>
        </MotionDiv>

        {/* No Teams State */}
        {availableTeams.length < 2 ? (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard hover={false} className="text-center max-w-md mx-auto">
              <GlassCardContent className="py-12">
                <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-muted/30 flex items-center justify-center">
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
                <Button onClick={handleQuickCreateTeam} className="gap-2 btn-orange-gradient rounded-xl" size="lg">
                  <Plus className="w-5 h-5" />
                  Create Team
                </Button>
              </GlassCardContent>
            </GlassCard>
          </MotionDiv>
        ) : (
          <>
            {/* Match Preview - VS Display */}
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <GlassCard hover={false} className="overflow-hidden">
                {/* Gradient top bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-primary to-amber-500" />
                
                <GlassCardContent className="py-10">
                  <div className="flex items-center justify-center gap-4 md:gap-10">
                    {/* Home Team */}
                    <motion.div 
                      className="text-center flex-1"
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      <AnimatePresence mode="wait">
                        {homeTeam ? (
                          <motion.div
                            key={homeTeam.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={springSmooth}
                          >
                            <div
                              className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden"
                              style={{
                                background: `linear-gradient(135deg, ${homeTeam.color || "#3b82f6"}, ${homeTeam.color || "#3b82f6"}99)`,
                                boxShadow: `0 12px 40px ${homeTeam.color || "#3b82f6"}50`,
                              }}
                            >
                              <div className="absolute inset-0 bg-white/10" />
                              <span className="text-3xl md:text-4xl font-bold text-white relative z-10">
                                {homeTeam.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <p className="font-semibold text-lg md:text-xl">{homeTeam.name}</p>
                            <Badge variant="secondary" className="mt-2 bg-sky-500/20 text-sky-400">Home</Badge>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="home-placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <div className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center">
                              <Users className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                            <p className="text-muted-foreground">Select team</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* VS Divider */}
                    <motion.div 
                      className="flex flex-col items-center gap-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                    >
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-linear-to-br from-primary/20 to-amber-500/20 flex items-center justify-center border border-primary/30 relative">
                        <Swords className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                        {/* Pulse effect when both teams selected */}
                        {canStart && (
                          <motion.div
                            className="absolute inset-0 rounded-2xl border-2 border-primary"
                            initial={{ scale: 1, opacity: 1 }}
                            animate={{ scale: 1.3, opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">vs</span>
                    </motion.div>

                    {/* Away Team */}
                    <motion.div 
                      className="text-center flex-1"
                      initial={{ x: 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      <AnimatePresence mode="wait">
                        {awayTeam ? (
                          <motion.div
                            key={awayTeam.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={springSmooth}
                          >
                            <div
                              className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden"
                              style={{
                                background: `linear-gradient(135deg, ${awayTeam.color || "#f97316"}, ${awayTeam.color || "#f97316"}99)`,
                                boxShadow: `0 12px 40px ${awayTeam.color || "#f97316"}50`,
                              }}
                            >
                              <div className="absolute inset-0 bg-white/10" />
                              <span className="text-3xl md:text-4xl font-bold text-white relative z-10">
                                {awayTeam.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <p className="font-semibold text-lg md:text-xl">{awayTeam.name}</p>
                            <Badge variant="secondary" className="mt-2 bg-amber-500/20 text-amber-400">Away</Badge>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="away-placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <div className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center">
                              <Users className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                            <p className="text-muted-foreground">Select team</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </MotionDiv>

            {/* Team Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Home Team Selection */}
              <MotionDiv
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <GlassCard hover={false}>
                  <GlassCardHeader className="pb-3">
                    <GlassCardTitle className="text-lg flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-sky-400" />
                      </div>
                      Home Team
                    </GlassCardTitle>
                    <GlassCardDescription>Select the first team</GlassCardDescription>
                  </GlassCardHeader>
                  <div className="h-px bg-border/30 mx-5" />
                  <GlassCardContent className="pt-4">
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                      {availableTeams.map((team) => {
                        const isSelected = team.id === homeTeamId;
                        const isDisabled = team.id === awayTeamId;
                        const teamColor = team.color || "#3b82f6";

                        return (
                          <motion.button
                            key={team.id}
                            type="button"
                            onClick={() => handleHomeTeamSelect(team.id)}
                            disabled={isDisabled}
                            whileHover={!isDisabled ? { scale: 1.01 } : undefined}
                            whileTap={!isDisabled ? { scale: 0.99 } : undefined}
                            className={`
                              w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 
                              ${isSelected
                                ? "bg-primary/20 ring-2 ring-primary shadow-lg"
                                : "bg-accent/20 hover:bg-accent/40 border border-border/20 hover:border-primary/30"
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
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={springSmooth}
                              >
                                <Check className="w-5 h-5 text-primary shrink-0" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </MotionDiv>

              {/* Away Team Selection */}
              <MotionDiv
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <GlassCard hover={false}>
                  <GlassCardHeader className="pb-3">
                    <GlassCardTitle className="text-lg flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-amber-400" />
                      </div>
                      Away Team
                    </GlassCardTitle>
                    <GlassCardDescription>Select the opponent</GlassCardDescription>
                  </GlassCardHeader>
                  <div className="h-px bg-border/30 mx-5" />
                  <GlassCardContent className="pt-4">
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
                      {availableTeams.map((team) => {
                        const isSelected = team.id === awayTeamId;
                        const isDisabled = team.id === homeTeamId;
                        const teamColor = team.color || "#f97316";

                        return (
                          <motion.button
                            key={team.id}
                            type="button"
                            onClick={() => handleAwayTeamSelect(team.id)}
                            disabled={isDisabled}
                            whileHover={!isDisabled ? { scale: 1.01 } : undefined}
                            whileTap={!isDisabled ? { scale: 0.99 } : undefined}
                            className={`
                              w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 
                              ${isSelected
                                ? "bg-primary/20 ring-2 ring-primary shadow-lg"
                                : "bg-accent/20 hover:bg-accent/40 border border-border/20 hover:border-primary/30"
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
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={springSmooth}
                              >
                                <Check className="w-5 h-5 text-primary shrink-0" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </MotionDiv>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-destructive text-center mb-4 font-medium"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Actions */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                variant="outline"
                onClick={handleRandomSelect}
                className="gap-2 rounded-xl h-12 px-8 glass-input hover:bg-accent/30"
                size="lg"
              >
                <Shuffle className="w-5 h-5" />
                Random Teams
              </Button>
              <motion.div
                whileHover={canStart ? { scale: 1.02 } : undefined}
                whileTap={canStart ? { scale: 0.98 } : undefined}
              >
                <Button
                  onClick={handleStartMatch}
                  disabled={!canStart}
                  className="gap-2 btn-orange-gradient text-primary-foreground rounded-xl h-12 px-10 font-semibold disabled:opacity-50"
                  size="lg"
                >
                  <Zap className="w-5 h-5" />
                  Start Match
                </Button>
              </motion.div>
            </MotionDiv>
          </>
        )}
      </main>
    </Background>
  );
}
