"use client";

import { memo } from "react";
import { motion } from "framer-motion";

/** A page's placeholder while its data loads. Inside the shell, the tab bar and top bar stay around it. */
export const PageLoadingSpinner = memo(function PageLoadingSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-[60vh] items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="h-8 w-8 rounded-full border-2 border-mb-coral border-t-transparent"
      />
    </div>
  );
});
