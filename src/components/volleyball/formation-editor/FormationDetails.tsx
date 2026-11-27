"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FormationVisibility } from "@/lib/volleyball/types";
import { Icon } from "@/components/shared/Icon";
import { toggleClass } from "../styles";
import { LABEL } from "@/components/shared/classes";

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

const FIELD_LABEL = `mb-1 block ${LABEL}`;

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
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-chip text-left"
        aria-expanded={expanded}
        aria-controls="formation-details-content"
      >
        <h3 className={LABEL}>Formation Details</h3>
        <Icon
          id="chevron-down"
          size={16}
          className={`shrink-0 text-ink-soft transition-transform ${expanded ? "rotate-180" : ""}`}
        />
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
            {/* The padding keeps a focus ring from being cut off by the clip above. */}
            <div className="flex flex-col gap-4 p-1">
              {/* Name */}
              <div>
                <label htmlFor="formation-name" className={FIELD_LABEL}>
                  Name *
                </label>
                <span className="field">
                  <input
                    id="formation-name"
                    type="text"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="My Custom Formation"
                  />
                </span>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="formation-description" className={FIELD_LABEL}>
                  Description
                </label>
                <textarea
                  id="formation-description"
                  value={description}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Notes about this formation..."
                  rows={3}
                  className="field-area block resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="formation-tags" className={FIELD_LABEL}>
                  Tags (comma separated)
                </label>
                <span className="field">
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
                  />
                </span>
              </div>

              {/* Visibility */}
              <div>
                <label className={FIELD_LABEL}>Visibility</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onVisibilityChange("private")}
                    className={`${toggleClass(visibility === "private")} flex-1`}
                    aria-pressed={visibility === "private"}
                  >
                    Private
                  </button>
                  <button
                    type="button"
                    onClick={() => onVisibilityChange("unlisted")}
                    className={`${toggleClass(visibility === "unlisted")} flex-1`}
                    aria-pressed={visibility === "unlisted"}
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
