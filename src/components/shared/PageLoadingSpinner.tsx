"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";

type PageLoadingSpinnerProps = {
  maxWidth?: string;
};

export const PageLoadingSpinner = memo(function PageLoadingSpinner({
  maxWidth = "max-w-6xl",
}: PageLoadingSpinnerProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className={`${maxWidth} mx-auto px-4 pb-12`}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          />
        </div>
      </main>
    </div>
  );
});
