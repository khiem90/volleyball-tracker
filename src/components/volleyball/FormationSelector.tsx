"use client";

import { memo } from "react";
import type { FormationType, RotationNumber } from "@/lib/volleyball/types";
import { getFormations } from "@/lib/volleyball/formations";

type FormationSelectorProps = {
  formation: FormationType;
  rotation: RotationNumber;
  onFormationChange: (f: FormationType) => void;
};

export const FormationSelector = memo(
  ({ formation, rotation, onFormationChange }: FormationSelectorProps) => {
    const formations = getFormations();

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Formation</h3>
          <span className="text-xs text-muted-foreground">
            Rotation {rotation}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {formations.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFormationChange(f.id)}
              className={`
                p-3 rounded-xl text-left transition-all duration-200
                border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                ${
                  formation === f.id
                    ? "bg-primary/10 border-primary text-foreground shadow-sm"
                    : "bg-accent/30 border-transparent text-muted-foreground hover:border-primary/30 hover:bg-accent/50"
                }
              `}
              aria-pressed={formation === f.id}
            >
              <div className="font-semibold text-sm mb-1">{f.name}</div>
              <div className="text-xs opacity-80 line-clamp-2">
                {f.description}
              </div>
            </button>
          ))}
        </div>

        {/* Selected formation details */}
        <div className="p-3 rounded-lg bg-accent/30 border border-border">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Trade-offs: </span>
            {formations.find((f) => f.id === formation)?.tradeoffs}
          </div>
        </div>
      </div>
    );
  }
);
FormationSelector.displayName = "FormationSelector";
