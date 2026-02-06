"use client";

import { memo, useState, useCallback } from "react";
import type {
  FormationType,
  RotationNumber,
  FormationCategory,
  UserFormation,
} from "@/lib/volleyball/types";
import { getFormations } from "@/lib/volleyball/formations";
import { getTemplateFormations } from "@/lib/volleyball/templateFormations";
import { FormationCategoryTabs } from "./FormationCategoryTabs";
import { FormationCard } from "./FormationCard";

// Simple mode for backward compatibility
type SimpleModeProps = {
  formation: FormationType;
  rotation: RotationNumber;
  onFormationChange: (f: FormationType) => void;
  enhanced?: false;
};

// Enhanced mode with categories
type EnhancedModeProps = {
  formation: FormationType | string;
  rotation: RotationNumber;
  onFormationChange: (f: FormationType | string) => void;
  enhanced: true;
  isAuthenticated?: boolean;
  userFormations?: UserFormation[];
  sharedFormation?: UserFormation | null;
  onCreateFormation?: () => void;
  onEditFormation?: (id: string) => void;
  onDuplicateFormation?: (formation: UserFormation) => void;
  onShareFormation?: (formation: UserFormation) => void;
  onDeleteFormation?: (id: string) => void;
  onSignInClick?: () => void;
};

type FormationSelectorProps = SimpleModeProps | EnhancedModeProps;

const isEnhancedMode = (props: FormationSelectorProps): props is EnhancedModeProps => {
  return props.enhanced === true;
};

export const FormationSelector = memo((props: FormationSelectorProps) => {
  const { formation, rotation, onFormationChange } = props;

  // If enhanced mode, use full category-based UI
  if (isEnhancedMode(props)) {
    return <EnhancedFormationSelector {...props} />;
  }

  // Simple mode - backward compatible
  const builtinFormations = getFormations();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Formation</h3>
        <span className="text-xs text-muted-foreground">
          Rotation {rotation}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {builtinFormations.map((f) => (
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
          {builtinFormations.find((f) => f.id === formation)?.tradeoffs}
        </div>
      </div>
    </div>
  );
});
FormationSelector.displayName = "FormationSelector";

// Enhanced selector with categories
const EnhancedFormationSelector = memo((props: EnhancedModeProps) => {
  const {
    formation,
    rotation,
    onFormationChange,
    isAuthenticated = false,
    userFormations = [],
    sharedFormation,
    onCreateFormation,
    onEditFormation,
    onDuplicateFormation,
    onShareFormation,
    onDeleteFormation,
    onSignInClick,
  } = props;

  const [activeCategory, setActiveCategory] = useState<FormationCategory>(() => {
    // Default to shared if there's a shared formation, otherwise builtin
    if (sharedFormation) return "shared";
    return "builtin";
  });

  const builtinFormations = getFormations();
  const templateFormations = getTemplateFormations();

  // Calculate counts
  const counts: Partial<Record<FormationCategory, number>> = {
    builtin: builtinFormations.length,
    template: templateFormations.length,
    custom: userFormations.length,
  };

  // Check if formation is a builtin type
  const isBuiltinFormation = (f: string): f is FormationType => {
    return ["traditional", "stack", "spread", "rightSlant", "leftSlant"].includes(f);
  };

  // Get selected formation info based on category
  const getSelectedInfo = () => {
    if (activeCategory === "builtin" && isBuiltinFormation(formation as string)) {
      const f = builtinFormations.find((b) => b.id === formation);
      return f ? { name: f.name, tradeoffs: f.tradeoffs } : null;
    }
    if (activeCategory === "template") {
      const t = templateFormations.find((t) => t.id === formation);
      return t ? { name: t.name, tradeoffs: t.description } : null;
    }
    if (activeCategory === "custom") {
      const u = userFormations.find((u) => u.id === formation);
      return u ? { name: u.name, tradeoffs: u.description } : null;
    }
    if (activeCategory === "shared" && sharedFormation) {
      return { name: sharedFormation.name, tradeoffs: sharedFormation.description };
    }
    return null;
  };

  const selectedInfo = getSelectedInfo();

  const handleCategoryChange = useCallback((category: FormationCategory) => {
    setActiveCategory(category);
    // Optionally auto-select first formation in category
  }, []);

  return (
    <div className="space-y-4">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Formation</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Rotation {rotation}
          </span>
          {isAuthenticated && onCreateFormation && (
            <button
              type="button"
              onClick={onCreateFormation}
              className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              + Create
            </button>
          )}
          {!isAuthenticated && onSignInClick && (
            <button
              type="button"
              onClick={onSignInClick}
              className="px-3 py-1 text-xs font-medium bg-accent text-foreground rounded-lg hover:bg-accent/80 transition-colors"
            >
              Sign in to create
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <FormationCategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        counts={counts}
        showShared={!!sharedFormation}
        isAuthenticated={isAuthenticated}
      />

      {/* Formation Grid based on category */}
      <div className="space-y-2">
        {/* Built-in Formations */}
        {activeCategory === "builtin" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {builtinFormations.map((f) => (
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
        )}

        {/* Template Formations */}
        {activeCategory === "template" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templateFormations.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onFormationChange(t.id)}
                className={`
                  p-3 rounded-xl text-left transition-all duration-200
                  border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                  ${
                    formation === t.id
                      ? "bg-primary/10 border-primary text-foreground shadow-sm"
                      : "bg-accent/30 border-transparent text-muted-foreground hover:border-primary/30 hover:bg-accent/50"
                  }
                `}
                aria-pressed={formation === t.id}
              >
                <div className="font-semibold text-sm mb-1">{t.name}</div>
                <div className="text-xs opacity-80 line-clamp-2">
                  {t.description}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Custom Formations */}
        {activeCategory === "custom" && (
          <>
            {!isAuthenticated ? (
              <div className="p-6 text-center rounded-xl bg-accent/30 border border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  Sign in to create and save your own formations
                </p>
                {onSignInClick && (
                  <button
                    type="button"
                    onClick={onSignInClick}
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Sign In
                  </button>
                )}
              </div>
            ) : userFormations.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-accent/30 border border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  You haven&apos;t created any formations yet
                </p>
                {onCreateFormation && (
                  <button
                    type="button"
                    onClick={onCreateFormation}
                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Create Your First Formation
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {userFormations.map((f) => (
                  <FormationCard
                    key={f.id}
                    formation={f}
                    isSelected={formation === f.id}
                    isOwner={true}
                    onSelect={() => onFormationChange(f.id)}
                    onEdit={onEditFormation ? () => onEditFormation(f.id) : undefined}
                    onDuplicate={onDuplicateFormation ? () => onDuplicateFormation(f) : undefined}
                    onShare={onShareFormation ? () => onShareFormation(f) : undefined}
                    onDelete={onDeleteFormation ? () => onDeleteFormation(f.id) : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Shared Formation */}
        {activeCategory === "shared" && sharedFormation && (
          <div className="space-y-2">
            <FormationCard
              formation={sharedFormation}
              isSelected={formation === sharedFormation.id}
              isOwner={false}
              onSelect={() => onFormationChange(sharedFormation.id)}
              onDuplicate={
                isAuthenticated && onDuplicateFormation
                  ? () => onDuplicateFormation(sharedFormation)
                  : undefined
              }
            />
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground text-center">
                Sign in to copy this formation to your collection
              </p>
            )}
          </div>
        )}
      </div>

      {/* Selected formation info */}
      {selectedInfo && (
        <div className="p-3 rounded-lg bg-accent/30 border border-border">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {activeCategory === "builtin" ? "Trade-offs" : "Description"}:{" "}
            </span>
            {selectedInfo.tradeoffs || "No description available"}
          </div>
        </div>
      )}
    </div>
  );
});
EnhancedFormationSelector.displayName = "EnhancedFormationSelector";
