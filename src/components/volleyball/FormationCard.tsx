"use client";

import { memo } from "react";
import type { UserFormation } from "@/lib/volleyball/types";

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

    return (
      <div
        className={`
          p-4 rounded-xl border-2 transition-all duration-200
          ${
            isSelected
              ? "bg-primary/10 border-primary shadow-sm"
              : "bg-card border-border hover:border-primary/30"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <button
            type="button"
            onClick={onSelect}
            className="flex-1 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            aria-pressed={isSelected}
          >
            <h4 className="font-semibold text-foreground line-clamp-1">
              {formation.name}
            </h4>
          </button>

          {/* Visibility badge */}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              formation.visibility === "unlisted"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {formation.visibility === "unlisted" ? "Shared" : "Private"}
          </span>
        </div>

        {/* Description */}
        {formation.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {formation.description}
          </p>
        )}

        {/* Tags */}
        {formation.tags && formation.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {formation.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-accent text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {formation.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-muted-foreground">
                +{formation.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <p className="text-xs text-muted-foreground mb-3">
          Updated {formatDate(formation.updatedAt)}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Select button */}
          <button
            type="button"
            onClick={onSelect}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent hover:bg-accent/80 text-foreground"
              }
            `}
            aria-label={isSelected ? "Selected" : "Select formation"}
          >
            {isSelected ? "Selected" : "Select"}
          </button>

          {/* Owner actions */}
          {isOwner && (
            <>
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Edit formation"
                >
                  Edit
                </button>
              )}

              {onDuplicate && (
                <button
                  type="button"
                  onClick={onDuplicate}
                  className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Duplicate formation"
                >
                  Duplicate
                </button>
              )}

              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Share formation"
                >
                  Share
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="px-3 py-1.5 rounded-lg text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
              className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
