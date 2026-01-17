"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";

interface ChampionDisplayProps {
  winnerName: string;
  winnerColor: string;
}

export const ChampionDisplay = memo(function ChampionDisplay({
  winnerName,
  winnerColor,
}: ChampionDisplayProps) {
  return (
    <div className="flex flex-col justify-center">
      <div className="text-center mb-4">
        <span className="text-sm font-medium text-amber-500">Champion</span>
      </div>
      <div className="w-56">
        <Card className="p-4 border-amber-500/50 bg-amber-500/10 text-center">
          <div
            className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2"
            style={{
              background: `linear-gradient(135deg, ${winnerColor}, ${winnerColor}99)`,
            }}
          >
            <span className="text-2xl">🏆</span>
          </div>
          <p className="font-bold text-amber-500">{winnerName}</p>
        </Card>
      </div>
    </div>
  );
});
