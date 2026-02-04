"use client";

import { memo } from "react";
import type { FormationCategory } from "@/lib/volleyball/types";

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
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                }
              `}
              aria-pressed={isActive}
              title={category.description}
            >
              {category.label}
              {typeof count === "number" && count > 0 && (
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
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
