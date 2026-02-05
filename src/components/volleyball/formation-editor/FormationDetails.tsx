"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FormationVisibility } from "@/lib/volleyball/types";

type FormationDetailsProps = {
  expanded: boolean;
  onToggleExpanded: () => void;
  name: string;
  description: string;
  tags: string[];
  visibility: FormationVisibility;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTagsChange: (tags: string[]) => void;
  onVisibilityChange: (visibility: FormationVisibility) => void;
};

export const FormationDetails = memo(function FormationDetails({
  expanded,
  onToggleExpanded,
  name,
  description,
  tags,
  visibility,
  onNameChange,
  onDescriptionChange,
  onTagsChange,
  onVisibilityChange,
}: FormationDetailsProps) {
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={expanded}
        aria-controls="formation-details-content"
      >
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Formation Details
        </h3>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="formation-details-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-1">
              {/* Name */}
              <div>
                <label htmlFor="formation-name" className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="formation-name"
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="My Custom Formation"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="formation-description" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  id="formation-description"
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Notes about this formation..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="formation-tags" className="block text-sm font-medium mb-1">
                  Tags (comma separated)
                </label>
                <input
                  id="formation-tags"
                  type="text"
                  value={tags.join(", ")}
                  onChange={(e) =>
                    onTagsChange(
                      e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="stack, 4-pass, advanced"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium mb-2">Visibility</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onVisibilityChange("private")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      visibility === "private"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => onVisibilityChange("unlisted")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      visibility === "unlisted"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent hover:bg-accent/80"
                    }`}
                  >
                    Unlisted (Shareable)
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
