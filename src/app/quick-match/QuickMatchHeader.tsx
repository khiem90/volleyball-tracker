"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { BoltIcon } from "@heroicons/react/24/outline";
import { MotionDiv, slideUp } from "@/components/motion";

type QuickMatchHeaderProps = {
  subtitle: string;
  showGuestBadge?: boolean;
};

export const QuickMatchHeader = memo(function QuickMatchHeader({
  subtitle,
  showGuestBadge = false,
}: QuickMatchHeaderProps) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={slideUp}
      className="text-center mb-10"
    >
      <motion.div
        className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-linear-to-br from-primary to-red-400 flex items-center justify-center shadow-2xl shadow-primary/40"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <BoltIcon className="w-10 h-10 text-primary-foreground" />
      </motion.div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Quick Match</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        {subtitle}
      </p>
      {showGuestBadge && (
        <Badge variant="secondary" className="mt-3 bg-amber-500/10 text-amber-600 border-amber-500/20">
          Guest Mode
        </Badge>
      )}
    </MotionDiv>
  );
});
