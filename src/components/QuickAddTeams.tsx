"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Minus, Plus, Sparkles, Check } from "lucide-react";

// Color style presets
const colorStyles = [
  {
    id: "vibrant",
    name: "Vibrant",
    description: "Bold, energetic colors",
    colors: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"],
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool blues and teals",
    colors: ["#0ea5e9", "#06b6d4", "#14b8a6", "#0d9488", "#0891b2", "#0284c7", "#0369a1", "#155e75"],
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm oranges and reds",
    colors: ["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#f59e0b", "#fb923c", "#f87171", "#fbbf24"],
  },
  {
    id: "forest",
    name: "Forest",
    description: "Natural greens",
    colors: ["#16a34a", "#15803d", "#166534", "#14532d", "#22c55e", "#4ade80", "#059669", "#10b981"],
  },
  {
    id: "berry",
    name: "Berry",
    description: "Purples and pinks",
    colors: ["#7c3aed", "#8b5cf6", "#a855f7", "#c026d3", "#d946ef", "#ec4899", "#f472b6", "#9333ea"],
  },
  {
    id: "monochrome",
    name: "Monochrome",
    description: "Shades of gray",
    colors: ["#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#64748b", "#475569", "#334155"],
  },
  {
    id: "rainbow",
    name: "Rainbow",
    description: "Full spectrum",
    colors: ["#ef4444", "#f97316", "#facc15", "#4ade80", "#22d3ee", "#3b82f6", "#a855f7", "#f472b6"],
  },
  {
    id: "neon",
    name: "Neon",
    description: "Bright, electric colors",
    colors: ["#ff0080", "#00ff80", "#8000ff", "#ff8000", "#00ffff", "#ff00ff", "#80ff00", "#0080ff"],
  },
];

const namingStyles = [
  { id: "team", prefix: "Team", example: "Team 1, Team 2..." },
  { id: "squad", prefix: "Squad", example: "Squad 1, Squad 2..." },
  { id: "group", prefix: "Group", example: "Group A, Group B..." },
  { id: "court", prefix: "Court", example: "Court 1, Court 2..." },
  { id: "side", prefix: "Side", example: "Side A, Side B..." },
];

interface QuickAddTeamsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTeams: (teams: { name: string; color: string }[]) => void;
  existingTeamCount: number;
}

export const QuickAddTeams = ({
  open,
  onOpenChange,
  onAddTeams,
  existingTeamCount,
}: QuickAddTeamsProps) => {
  const [teamCount, setTeamCount] = useState(4);
  const [selectedStyle, setSelectedStyle] = useState(colorStyles[0].id);
  const [selectedNaming, setSelectedNaming] = useState(namingStyles[0].id);
  const [startNumber, setStartNumber] = useState(existingTeamCount + 1);

  // Update start number when dialog opens
  useState(() => {
    setStartNumber(existingTeamCount + 1);
  });

  const currentColorStyle = useMemo(
    () => colorStyles.find((s) => s.id === selectedStyle) || colorStyles[0],
    [selectedStyle]
  );

  const currentNamingStyle = useMemo(
    () => namingStyles.find((s) => s.id === selectedNaming) || namingStyles[0],
    [selectedNaming]
  );

  const handleDecrease = useCallback(() => {
    setTeamCount((prev) => Math.max(2, prev - 1));
  }, []);

  const handleIncrease = useCallback(() => {
    setTeamCount((prev) => Math.min(16, prev + 1));
  }, []);

  const getTeamLabel = useCallback(
    (index: number) => {
      const num = startNumber + index;
      if (currentNamingStyle.id === "group" || currentNamingStyle.id === "side") {
        const letter = String.fromCharCode(64 + num);
        return `${currentNamingStyle.prefix} ${letter}`;
      }
      return `${currentNamingStyle.prefix} ${num}`;
    },
    [currentNamingStyle, startNumber]
  );

  const getTeamColor = useCallback(
    (index: number) => {
      return currentColorStyle.colors[index % currentColorStyle.colors.length];
    },
    [currentColorStyle]
  );

  const previewTeams = useMemo(() => {
    return Array.from({ length: teamCount }, (_, i) => ({
      name: getTeamLabel(i),
      color: getTeamColor(i),
    }));
  }, [teamCount, getTeamLabel, getTeamColor]);

  const handleCreate = useCallback(() => {
    onAddTeams(previewTeams);
    onOpenChange(false);
    setTeamCount(4);
  }, [previewTeams, onAddTeams, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Quick Add Teams
          </DialogTitle>
          <DialogDescription>
            Quickly create multiple numbered teams with a consistent style.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 min-h-0">
          {/* Team Count */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Number of Teams</label>
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrease}
                disabled={teamCount <= 2}
                className="h-12 w-12 rounded-full"
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <span className="text-5xl font-bold tabular-nums text-primary">
                  {teamCount}
                </span>
                <p className="text-xs text-muted-foreground mt-1">teams</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrease}
                disabled={teamCount >= 16}
                className="h-12 w-12 rounded-full"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Naming Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Naming Style</label>
            <div className="flex flex-wrap gap-2">
              {namingStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedNaming(style.id)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                    ${selectedNaming === style.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card border border-border/40 hover:border-primary/40"
                    }
                  `}
                >
                  {style.prefix}
                </button>
              ))}
            </div>
          </div>

          {/* Color Style */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Color Style</label>
            <div className="grid grid-cols-2 gap-2">
              {colorStyles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedStyle(style.id)}
                  className={`
                    p-3 rounded-xl text-left transition-all duration-200 cursor-pointer
                    ${selectedStyle === style.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "bg-card border border-border/40 hover:border-primary/40"
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex -space-x-1">
                      {style.colors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border-2 border-background"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{style.name}</span>
                    {selectedStyle === style.id && (
                      <Check className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{style.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Preview</label>
              <Badge variant="secondary">{teamCount} teams</Badge>
            </div>
            <div className="p-4 rounded-xl bg-card/50 border border-border/40 max-h-40 overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-2 gap-2">
                {previewTeams.map((team, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${team.color}15, ${team.color}08)`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${team.color}, ${team.color}cc)`,
                      }}
                    >
                      <span className="text-xs font-bold text-white">
                        {team.name.charAt(team.name.length - 1)}
                      </span>
                    </div>
                    <span className="text-sm font-medium truncate">{team.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2 shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="flex-1 gap-2 shadow-lg shadow-primary/20">
            <Sparkles className="w-4 h-4" />
            Create {teamCount} Teams
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
