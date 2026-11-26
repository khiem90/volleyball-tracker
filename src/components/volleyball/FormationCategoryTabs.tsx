"use client";

import { memo } from "react";
import type { FormationCategory } from "@/lib/volleyball/types";
import { cn } from "@/lib/utils";
import { toggleClass } from "./styles";

type CategoryConfig = {
  id: FormationCategory;
  label: string;
  description: string;
};

const CATEGORIES: CategoryConfig[] = [
  { id: "builtin", label: "Built-in", description: "Researched formations" },
  { id: "template", label: "Templates", description: "Starter templates" },
  { id: "custom", label: "My Formations", description: "Your custom formations" },
  { id: "shared", label: "Shared", description: "Formations shared with you" },
];

type FormationCategoryTabsProps = {
  activeCategory: FormationCategory;
  onCategoryChange: (category: FormationCategory) => void;
  counts?: Partial<Record<FormationCategory, number>>;
  showShared?: boolean;
  isAuthenticated?: boolean;
};

export const FormationCategoryTabs = memo(
  ({
    activeCategory,
    onCategoryChange,
    counts = {},
    showShared = false,
    isAuthenticated = false,
  }: FormationCategoryTabsProps) => {
    // Filter categories based on context
    const visibleCategories = CATEGORIES.filter((cat) => {
      // Always show built-in and templates
      if (cat.id === "builtin" || cat.id === "template") return true;
      // Show custom only if authenticated
      if (cat.id === "custom") return isAuthenticated;
      // Show shared only if there's a shared formation
      if (cat.id === "shared") return showShared;
      return false;
    });

    return (
      <div className="flex flex-wrap gap-2">
        {visibleCategories.map((category) => {
          const count = counts[category.id];
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              className={cn(toggleClass(isActive), "px-4")}
              aria-pressed={isActive}
              title={category.description}
            >
              {category.label}
              {typeof count === "number" && count > 0 && (
                // The count sits on the button's own ground: ink when chosen, white when not.
                <span
                  className={`rounded-pill px-1.5 py-0.5 text-caption tabular-nums ${
                    isActive ? "bg-white/20 text-white" : "bg-fill text-ink-soft"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
);
FormationCategoryTabs.displayName = "FormationCategoryTabs";
