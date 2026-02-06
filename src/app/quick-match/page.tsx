"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";
import { MotionDiv, springSmooth } from "@/components/motion";
import {
  UserGroupIcon,
  BoltIcon,
  PlusIcon,
  ArrowsRightLeftIcon,
} from "@heroicons/react/24/outline";
import { SwordsIcon } from "@/lib/icons";
import { DecorativeBackground } from "@/components/shared";
import { useQuickMatchPage } from "@/hooks/useQuickMatchPage";
import { useAuth } from "@/context/AuthContext";
import { GuestQuickMatchView } from "./GuestQuickMatchView";
import { QuickMatchHeader } from "./QuickMatchHeader";
import { TeamSelectionCard } from "./TeamSelectionCard";

export default function QuickMatchPage() {
  const router = useRouter();
  const { isGuest, isLoading } = useAuth();
  const {
    availableTeams,
    awayTeam,
    awayTeamId,
    canStart,
    error,
    handleAwayTeamSelect,
    handleHomeTeamSelect,
    handleQuickCreateTeam,
    handleRandomSelect,
    handleStartMatch,
    homeTeam,
    homeTeamId,
  } = useQuickMatchPage();

  const handleGuestStartMatch = () => {
    router.push("/match/guest");
  };

  // Guest Mode View
  if (!isLoading && isGuest) {
    return <GuestQuickMatchView onStartMatch={handleGuestStartMatch} />;
  }

  // Authenticated User View
  return (
    <div className="min-h-screen bg-background">
      <DecorativeBackground />
      <Navigation />

      <main className="relative max-w-5xl mx-auto px-4 pt-8 pb-12">
        <QuickMatchHeader subtitle="Start a quick match between two teams without creating a competition" />

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
                  <UserGroupIcon className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {availableTeams.length === 0
                    ? "No teams available"
                    : "Need at least 2 teams"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create some teams first to start a quick match.
                </p>
                <Button onClick={handleQuickCreateTeam} className="gap-2 btn-teal-gradient rounded-xl" size="lg">
                  <PlusIcon className="w-5 h-5" />
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
                <div className="h-1.5 w-full bg-linear-to-r from-sky-500 via-primary to-amber-500" />

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
                            <Badge variant="secondary" className="mt-2 bg-sky-100 text-sky-600">Home</Badge>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="home-placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <div className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center">
                              <UserGroupIcon className="w-10 h-10 text-muted-foreground/30" />
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
                        <SwordsIcon className="w-8 h-8 md:w-10 md:h-10 text-primary" />
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
                            <Badge variant="secondary" className="mt-2 bg-amber-100 text-amber-600">Away</Badge>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="away-placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <div className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 flex items-center justify-center">
                              <UserGroupIcon className="w-10 h-10 text-muted-foreground/30" />
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
              <TeamSelectionCard
                title="Home Team"
                description="Select the first team"
                iconColorClass="bg-sky-500/20 text-sky-500"
                selectedTeamId={homeTeamId}
                disabledTeamId={awayTeamId}
                teams={availableTeams}
                defaultColor="#3b82f6"
                onSelect={handleHomeTeamSelect}
                animationDirection="left"
                animationDelay={0.4}
              />
              <TeamSelectionCard
                title="Away Team"
                description="Select the opponent"
                iconColorClass="bg-amber-500/20 text-amber-500"
                selectedTeamId={awayTeamId}
                disabledTeamId={homeTeamId}
                teams={availableTeams}
                defaultColor="#f97316"
                onSelect={handleAwayTeamSelect}
                animationDirection="right"
                animationDelay={0.5}
              />
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
                <ArrowsRightLeftIcon className="w-5 h-5" />
                Random Teams
              </Button>
              <motion.div
                whileHover={canStart ? { scale: 1.02 } : undefined}
                whileTap={canStart ? { scale: 0.98 } : undefined}
              >
                <Button
                  onClick={handleStartMatch}
                  disabled={!canStart}
                  className="gap-2 btn-teal-gradient text-primary-foreground rounded-xl h-12 px-10 font-semibold disabled:opacity-50"
                  size="lg"
                >
                  <BoltIcon className="w-5 h-5" />
                  Start Match
                </Button>
              </motion.div>
            </MotionDiv>
          </>
        )}
      </main>
    </div>
  );
}
