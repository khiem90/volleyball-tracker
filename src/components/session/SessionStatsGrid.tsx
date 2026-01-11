"use client";

import { Card } from "@/components/ui/card";

interface SessionStatsGridProps {
  upcomingCount: number;
  liveCount: number;
  completedCount: number;
}

export const SessionStatsGrid = ({
  upcomingCount,
  liveCount,
  completedCount,
}: SessionStatsGridProps) => (
  <div className="grid grid-cols-3 gap-4">
    <Card className="p-4 text-center">
      <p className="text-2xl font-bold">{upcomingCount}</p>
      <p className="text-sm text-muted-foreground">Upcoming</p>
    </Card>
    <Card className="p-4 text-center">
      <p className="text-2xl font-bold text-amber-500">{liveCount}</p>
      <p className="text-sm text-muted-foreground">Live</p>
    </Card>
    <Card className="p-4 text-center">
      <p className="text-2xl font-bold text-emerald-500">{completedCount}</p>
      <p className="text-sm text-muted-foreground">Completed</p>
    </Card>
  </div>
);
