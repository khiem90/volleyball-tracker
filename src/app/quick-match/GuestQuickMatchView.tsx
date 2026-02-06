"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassCardContent } from "@/components/ui/glass-card";
import { MotionDiv } from "@/components/motion";
import {
  BoltIcon,
  ArrowRightEndOnRectangleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { SwordsIcon } from "@/lib/icons";
import { DecorativeBackground } from "@/components/shared";
import { GUEST_HOME_TEAM, GUEST_AWAY_TEAM } from "@/constants/guestTeams";
import { QuickMatchHeader } from "./QuickMatchHeader";

type GuestQuickMatchViewProps = {
  onStartMatch: () => void;
};

export const GuestQuickMatchView = ({ onStartMatch }: GuestQuickMatchViewProps) => {
  return (
    <div className="min-h-screen bg-background">
      <DecorativeBackground />
      <Navigation />

      <main className="relative max-w-5xl mx-auto px-4 pt-8 pb-12">
        <QuickMatchHeader
          subtitle="Try a quick match as a guest with default teams"
          showGuestBadge
        />

        {/* Guest Match Preview */}
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
                {/* Home Team (Team A) */}
                <motion.div
                  className="text-center flex-1"
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <div
                    className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${GUEST_HOME_TEAM.color}, ${GUEST_HOME_TEAM.color}99)`,
                      boxShadow: `0 12px 40px ${GUEST_HOME_TEAM.color}50`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white/10" />
                    <span className="text-3xl md:text-4xl font-bold text-white relative z-10">
                      A
                    </span>
                  </div>
                  <p className="font-semibold text-lg md:text-xl">{GUEST_HOME_TEAM.name}</p>
                  <Badge variant="secondary" className="mt-2 bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">Home</Badge>
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
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-primary"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">vs</span>
                </motion.div>

                {/* Away Team (Team B) */}
                <motion.div
                  className="text-center flex-1"
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <div
                    className="w-24 h-24 md:w-28 md:h-28 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${GUEST_AWAY_TEAM.color}, ${GUEST_AWAY_TEAM.color}99)`,
                      boxShadow: `0 12px 40px ${GUEST_AWAY_TEAM.color}50`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white/10" />
                    <span className="text-3xl md:text-4xl font-bold text-white relative z-10">
                      B
                    </span>
                  </div>
                  <p className="font-semibold text-lg md:text-xl">{GUEST_AWAY_TEAM.name}</p>
                  <Badge variant="secondary" className="mt-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">Away</Badge>
                </motion.div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </MotionDiv>

        {/* Start Match Button */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={onStartMatch}
              className="gap-2 btn-teal-gradient text-primary-foreground rounded-xl h-14 px-12 font-semibold text-lg"
              size="lg"
            >
              <BoltIcon className="w-6 h-6" />
              Start Match
            </Button>
          </motion.div>
        </MotionDiv>

        {/* Sign In CTA */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <GlassCard hover={false} className="max-w-lg mx-auto">
            <GlassCardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <LockClosedIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Want more features?</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Sign in to create custom teams, run tournaments, and save your match history.
                  </p>
                  <Link href="/login?redirect=/quick-match">
                    <Button variant="outline" size="sm" className="gap-2 cursor-pointer rounded-lg">
                      <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </MotionDiv>
      </main>
    </div>
  );
};
