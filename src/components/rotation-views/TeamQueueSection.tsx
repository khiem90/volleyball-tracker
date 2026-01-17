"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, Settings2 } from "lucide-react";
import type { TeamQueueSectionProps } from "./types";

export const TeamQueueSection = memo(function TeamQueueSection({
  queue,
  getTeamName,
  getTeamColor,
  canEdit,
  onEditQueue,
}: TeamQueueSectionProps) {
  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Queue ({queue.length} waiting)
          </div>
          {canEdit && queue.length > 1 && onEditQueue && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-blue-500 hover:text-blue-400"
              onClick={onEditQueue}
              aria-label="Edit queue order"
            >
              <Settings2 className="w-4 h-4" />
              Reorder
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            All teams are on court!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {queue.map((item, index) => (
              <div
                key={`${item.teamId}-${index}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/50"
              >
                <span className="text-xs text-muted-foreground font-medium w-5">
                  #{index + 1}
                </span>
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${getTeamColor(
                      item.teamId
                    )}, ${getTeamColor(item.teamId)}cc)`,
                  }}
                >
                  <Users className="w-3 h-3 text-white" />
                </div>
                <span className="font-medium text-sm">
                  {getTeamName(item.teamId)}
                </span>
                {item.championCount !== undefined && item.championCount > 0 && (
                  <span className="text-xs text-amber-500 font-medium">
                    👑×{item.championCount}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
