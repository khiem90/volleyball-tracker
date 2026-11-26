"use client";

import { memo, useState, useCallback } from "react";
import type {
  FormationType,
  RotationNumber,
  FormationCategory,
  UserFormation,
} from "@/lib/volleyball/types";
import { getFormations, isBuiltinFormation } from "@/lib/volleyball/formations";
import { getTemplateFormations } from "@/lib/volleyball/templateFormations";
import { resolveFormation } from "@/lib/volleyball/formationChoice";
import { FormationCategoryTabs } from "./FormationCategoryTabs";
import { FormationCard } from "./FormationCard";
import { choiceTileClass } from "./styles";

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

/** One built-in formation or template to pick: its name over two lines of what it is for. */
const ChoiceTile = ({
  name,
  description,
  chosen,
  onChoose,
}: {
  name: string;
  description: string;
  chosen: boolean;
  onChoose: () => void;
}) => (
  <button
    type="button"
    onClick={onChoose}
    className={choiceTileClass(chosen)}
    aria-pressed={chosen}
  >
    <span className="text-label font-semibold text-ink">{name}</span>
    <span className="line-clamp-2 text-caption text-ink-soft">{description}</span>
  </button>
);

/** The grey note under the choices: a lead word, then what it says about the chosen formation. */
const ChoiceNote = ({ lead, children }: { lead: string; children: React.ReactNode }) => (
  <div className="rounded-tile bg-fill p-3 text-caption text-ink-soft">
    <span className="font-medium text-ink">{lead}: </span>
    {children}
  </div>
);

export const FormationSelector = memo((props: FormationSelectorProps) => {
  const { formation, rotation, onFormationChange } = props;

  // If enhanced mode, use full category-based UI
  if (isEnhancedMode(props)) {
    return <EnhancedFormationSelector {...props} />;
  }

  // Simple mode - backward compatible
  const builtinFormations = getFormations();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-label font-semibold">Formation</h3>
        <span className="text-caption text-ink-soft">Rotation {rotation}</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {builtinFormations.map((f) => (
          <ChoiceTile
            key={f.id}
            name={f.name}
            description={f.description}
            chosen={formation === f.id}
            onChoose={() => onFormationChange(f.id)}
          />
        ))}
      </div>

      {/* Selected formation details */}
      <ChoiceNote lead="Trade-offs">
        {builtinFormations.find((f) => f.id === formation)?.tradeoffs}
      </ChoiceNote>
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
    // Open on the tab holding the formation the page starts with. A saved
    // formation may not have loaded yet, so anything unresolved is custom.
    if (sharedFormation) return "shared";
    return resolveFormation(formation, userFormations)?.source ?? "custom";
  });

  const builtinFormations = getFormations();
  const templateFormations = getTemplateFormations();

  // Calculate counts
  const counts: Partial<Record<FormationCategory, number>> = {
    builtin: builtinFormations.length,
    template: templateFormations.length,
    custom: userFormations.length,
  };

  // Get selected formation info based on category
  const getSelectedInfo = () => {
    if (activeCategory === "builtin" && isBuiltinFormation(formation)) {
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
    <div className="flex flex-col gap-4">
      {/* Header with Create button */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-label font-semibold">Formation</h3>
        <div className="flex items-center gap-2">
          <span className="text-caption text-ink-soft">Rotation {rotation}</span>
          {isAuthenticated && onCreateFormation && (
            <button type="button" onClick={onCreateFormation} className="btn btn-ink px-4">
              + Create
            </button>
          )}
          {!isAuthenticated && onSignInClick && (
            <button type="button" onClick={onSignInClick} className="btn btn-fill px-4">
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
      <div className="flex flex-col gap-2">
        {/* Built-in Formations */}
        {activeCategory === "builtin" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {builtinFormations.map((f) => (
              <ChoiceTile
                key={f.id}
                name={f.name}
                description={f.description}
                chosen={formation === f.id}
                onChoose={() => onFormationChange(f.id)}
              />
            ))}
          </div>
        )}

        {/* Template Formations */}
        {activeCategory === "template" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {templateFormations.map((t) => (
              <ChoiceTile
                key={t.id}
                name={t.name}
                description={t.description}
                chosen={formation === t.id}
                onChoose={() => onFormationChange(t.id)}
              />
            ))}
          </div>
        )}

        {/* Custom Formations */}
        {activeCategory === "custom" && (
          <>
            {!isAuthenticated ? (
              <div className="flex flex-col items-center gap-3 rounded-tile bg-fill p-6 text-center">
                <p className="text-label text-ink-soft">
                  Sign in to create and save your own formations
                </p>
                {onSignInClick && (
                  <button type="button" onClick={onSignInClick} className="btn btn-ink">
                    Sign In
                  </button>
                )}
              </div>
            ) : userFormations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-tile bg-fill p-6 text-center">
                <p className="text-label text-ink-soft">
                  You haven&apos;t created any formations yet
                </p>
                {onCreateFormation && (
                  <button type="button" onClick={onCreateFormation} className="btn btn-ink">
                    Create Your First Formation
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
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
          <div className="flex flex-col gap-2">
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
              <p className="text-center text-caption text-ink-soft">
                Sign in to copy this formation to your collection
              </p>
            )}
          </div>
        )}
      </div>

      {/* Selected formation info */}
      {selectedInfo && (
        <ChoiceNote lead={activeCategory === "builtin" ? "Trade-offs" : "Description"}>
          {selectedInfo.tradeoffs || "No description available"}
        </ChoiceNote>
      )}
    </div>
  );
});
EnhancedFormationSelector.displayName = "EnhancedFormationSelector";
