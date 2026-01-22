"use client";

import { ArrowRightLeft } from "lucide-react";
import type { SwapResult } from "@/lib/eliminationSwap";

interface SwapWarningProps {
  swapInfo: SwapResult | null;
  getTeamName: (id: string) => string;
}

export const SwapWarning = ({ swapInfo, getTeamName }: SwapWarningProps) => {
  if (!swapInfo?.needsSwap || !swapInfo.displacedTeamId || !swapInfo.swappingTeamId) {
    return null;
  }

  return (
    <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
      <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
        <ArrowRightLeft className="w-4 h-4 shrink-0" />
        <span>
          <strong>{getTeamName(swapInfo.swappingTeamId)}</strong> is in
          another match. Saving will swap{" "}
          <strong>{getTeamName(swapInfo.displacedTeamId)}</strong> into
          that match.
        </span>
      </p>
    </div>
  );
};
