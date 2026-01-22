"use client";

import { Users } from "lucide-react";

interface NextUpIndicatorProps {
  teamId: string;
  teamName: string;
  teamColor: string;
}

export const NextUpIndicator = ({ teamName, teamColor }: NextUpIndicatorProps) => {
  return (
    <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
      <p className="text-xs text-primary font-medium mb-1">Next to Play</p>
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)`,
          }}
        >
          <Users className="w-3 h-3 text-white" />
        </div>
        <span className="font-semibold">{teamName}</span>
      </div>
    </div>
  );
};
