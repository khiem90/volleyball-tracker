"use client";

import { memo } from "react";
import type { UserFormation } from "@/lib/volleyball/types";
import { Chip } from "@/components/shared/Chip";
import { Icon } from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

type FormationCardProps = {
  formation: UserFormation;
  isSelected?: boolean;
  isOwner?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
};

export const FormationCard = memo(
  ({
    formation,
    isSelected = false,
    isOwner = false,
    onSelect,
    onEdit,
    onDuplicate,
    onShare,
    onDelete,
  }: FormationCardProps) => {
    const formatDate = (timestamp: number): string => {
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    // Edit, Duplicate, and Share are the grey button. On the green tint it
    // turns white, as the chips do, so it keeps an edge.
    const secondary = cn("btn btn-fill px-3", isSelected && "bg-surface hover:bg-fill");

    return (
      <div
        className={`flex flex-col gap-2 rounded-tile border p-4 transition-colors ${
          isSelected ? "border-action bg-action-tint" : "border-line bg-surface"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSelect}
            className="flex min-h-11 min-w-0 flex-1 items-center rounded-chip text-left"
            aria-pressed={isSelected}
          >
            <h4 className="line-clamp-1 text-title font-semibold wrap-anywhere">
              {formation.name}
            </h4>
          </button>

          {/* Visibility chip. On the green tint a grey chip turns white, so it still shows. */}
          <Chip
            tone={formation.visibility === "unlisted" ? "action" : "fill"}
            className={isSelected ? "bg-surface" : ""}
          >
            {formation.visibility === "unlisted" ? "Shared" : "Private"}
          </Chip>
        </div>

        {/* Description */}
        {formation.description && (
          <p className="line-clamp-2 text-label text-ink-soft">
            {formation.description}
          </p>
        )}

        {/* Tags */}
        {formation.tags && formation.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {formation.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} className={isSelected ? "bg-surface" : ""}>
                {tag}
              </Chip>
            ))}
            {formation.tags.length > 3 && (
              <span className="px-2 text-caption text-ink-soft">
                +{formation.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <p className="text-caption text-ink-soft">
          Updated {formatDate(formation.updatedAt)}
        </p>

        {/* Actions */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {/* Select button */}
          <button
            type="button"
            onClick={onSelect}
            className={`btn px-4 ${isSelected ? "btn-ink" : "btn-fill"}`}
            aria-label={isSelected ? "Selected" : "Select formation"}
          >
            {isSelected && <Icon id="check" size={14} />}
            {isSelected ? "Selected" : "Select"}
          </button>

          {/* Owner actions */}
          {isOwner && (
            <>
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className={secondary}
                  aria-label="Edit formation"
                >
                  Edit
                </button>
              )}

              {onDuplicate && (
                <button
                  type="button"
                  onClick={onDuplicate}
                  className={secondary}
                  aria-label="Duplicate formation"
                >
                  Duplicate
                </button>
              )}

              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className={secondary}
                  aria-label="Share formation"
                >
                  Share
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="btn btn-danger-quiet px-3"
                  aria-label="Delete formation"
                >
                  Delete
                </button>
              )}
            </>
          )}

          {/* Non-owner can duplicate (fork) */}
          {!isOwner && onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className={secondary}
              aria-label="Copy to My Formations"
            >
              Copy to My Formations
            </button>
          )}
        </div>
      </div>
    );
  }
);
FormationCard.displayName = "FormationCard";
