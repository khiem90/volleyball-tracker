"use client";

import { memo } from "react";
import { MbTabs } from "@/components/matchbook/Tabs";
import { MbMenu } from "@/components/matchbook/Menu";
import { MbSkeleton } from "@/components/matchbook/Skeleton";
import { PanelEmpty } from "@/components/matchbook/Panel";
import { MbIcon } from "@/components/matchbook/MbIcon";
import type {
  MbFormationCategory,
  MbFormationChoice,
} from "@/components/matchbook/useMatchbookRotations";
import type { FormationsStatus } from "@/hooks/useUserFormations";

/* ===========================================================================
   FORMATION PICKER

   `FormationSelector` + `FormationCategoryTabs` + `FormationCard`, rebuilt.
   Three defects went with them:

     THE TEMPLATES TAB LIED. Selecting a template set `aria-pressed="true"` and
     swapped the description strip while the court kept rendering the previously
     selected BUILT-IN, because the page resolved every non-builtin id through
     the user's own Firestore documents. Fixed in `useMatchbookRotations`; the
     tab is re-labelled "Starters", which is what those two documents are.

     THE SHARED TAB WAS DEAD CODE. `FormationSelector` accepted a
     `sharedFormation` prop that no caller has ever passed, so `showShared` was
     permanently false. It is gone rather than carried forward unrendered.

     THE CUSTOM TAB VANISHED FOR GUESTS. Hiding a whole category is worse than
     showing it empty: the reader cannot tell whether the feature exists. It now
     renders the standard sign-in state, and the designer stays fully usable
     either way.
   =========================================================================== */

const CATEGORY_LABEL: Record<MbFormationCategory, string> = {
  builtin: "Built-in",
  starter: "Starters",
  custom: "My Formations",
};

const CardGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
    {children}
  </div>
);

const FormationCardButton = ({
  choice,
  selected,
  onSelect,
  actions,
}: {
  choice: MbFormationChoice;
  selected: boolean;
  onSelect: () => void;
  actions?: React.ReactNode;
}) => (
  /* The card is the control and the overflow menu sits BESIDE it, never inside
     it: a button inside a button is invalid, and it is how the old card ended
     up with five 24px targets stacked in a 187px row. */
  <div
    className="flex items-stretch gap-2 border border-mb-navy"
    style={selected ? { borderWidth: 3 } : undefined}
  >
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`mb-btn-touch flex min-w-0 flex-1 flex-col items-start gap-1 p-3 text-left transition-colors ${
        selected
          ? "bg-mb-navy text-mb-paper-bright"
          : "bg-mb-paper-bright hover:bg-[var(--mb-tint-1)] active:bg-[var(--mb-tint-press)]"
      }`}
    >
      <span className="matchbook-display w-full truncate text-[0.85rem] font-bold tracking-[0.04em]">
        {choice.name}
      </span>
      {choice.description && (
        <span
          className={`line-clamp-3 text-[0.72rem] leading-snug ${
            selected ? "text-mb-paper-bright/80" : "text-mb-ink-muted"
          }`}
        >
          {choice.description}
        </span>
      )}
      {selected && (
        <span className="mb-kicker mt-auto flex items-center gap-1 pt-1 text-mb-paper-bright">
          <MbIcon id="check" size={11} />
          On court
        </span>
      )}
    </button>
    {actions && (
      <div className="flex shrink-0 items-start border-l border-mb-rule p-1.5">
        {actions}
      </div>
    )}
  </div>
);

export interface FormationPickerProps {
  category: MbFormationCategory;
  onCategoryChange: (category: MbFormationCategory) => void;
  builtins: MbFormationChoice[];
  starters: MbFormationChoice[];
  custom: MbFormationChoice[];
  selectedId: string;
  selected: MbFormationChoice;
  onSelect: (id: string) => void;
  isAuthenticated: boolean;
  status: FormationsStatus;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}

export const FormationPicker = memo(
  ({
    category,
    onCategoryChange,
    builtins,
    starters,
    custom,
    selectedId,
    selected,
    onSelect,
    isAuthenticated,
    status,
    onRetry,
    onCreate,
    onEdit,
    onDuplicate,
    onShare,
    onDelete,
  }: FormationPickerProps) => {
    const items = [
      { value: "builtin", label: CATEGORY_LABEL.builtin, count: builtins.length },
      { value: "starter", label: CATEGORY_LABEL.starter, count: starters.length },
      {
        value: "custom",
        label: CATEGORY_LABEL.custom,
        count: isAuthenticated ? custom.length : undefined,
      },
    ];

    return (
      <div className="flex flex-1 flex-col">
        <MbTabs
          aria-label="Formation source"
          value={category}
          onValueChange={(value) => onCategoryChange(value as MbFormationCategory)}
          items={items}
        />

        {category === "builtin" && (
          <>
            <CardGrid>
              {builtins.map((choice) => (
                <FormationCardButton
                  key={choice.id}
                  choice={choice}
                  selected={selectedId === choice.id}
                  onSelect={() => onSelect(choice.id)}
                />
              ))}
            </CardGrid>
            {selected.category === "builtin" && selected.tradeoffs && (
              <div className="border-t border-mb-rule px-4 py-3">
                <p className="mb-kicker">Trade-offs</p>
                <p className="text-[0.76rem] leading-snug text-mb-ink-muted">
                  {selected.tradeoffs}
                </p>
              </div>
            )}
          </>
        )}

        {category === "starter" && (
          <>
            <CardGrid>
              {starters.map((choice) => (
                <FormationCardButton
                  key={choice.id}
                  choice={choice}
                  selected={selectedId === choice.id}
                  onSelect={() => onSelect(choice.id)}
                />
              ))}
            </CardGrid>
            <div className="border-t border-mb-rule px-4 py-3">
              <p className="mb-kicker">Starters</p>
              <p className="text-[0.76rem] leading-snug text-mb-ink-muted">
                A starter is a blank slate you edit and save. Selecting one puts
                it on the court; open the editor to move players and keep it.
              </p>
            </div>
          </>
        )}

        {category === "custom" && (
          <>
            {!isAuthenticated ? (
              <PanelEmpty
                message="No saved formations exist yet — sign in to build, keep and share your own."
                actionLabel="Sign in"
                href="/login?redirect=/tools/volleyball-rotations"
              />
            ) : status === "loading" ? (
              /* Skeleton at the FINAL geometry: three cards in the same grid,
                 same 104px card height, so the swap costs zero layout shift. */
              <CardGrid>
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 border border-mb-rule p-3"
                    style={{ height: 104 }}
                  >
                    <MbSkeleton w="60%" h={14} />
                    <MbSkeleton lines={2} h={9} />
                  </div>
                ))}
              </CardGrid>
            ) : status === "denied" ? (
              <PanelEmpty
                tone="denied"
                message="No access to these formations — they belong to another account."
                actionLabel="Open the archive"
                href="/tools/volleyball-rotations/my-formations"
              />
            ) : status === "error" ? (
              <PanelEmpty
                tone="error"
                message="Saved formations could not be loaded — the connection to the formation store failed."
                actionLabel="Try again"
                onAction={onRetry}
              />
            ) : custom.length === 0 ? (
              <PanelEmpty
                message={
                  status === "stale"
                    ? "No saved formations could be read — the list is offline, so anything you have saved is not shown."
                    : "No saved formations exist yet — build one in the editor and it appears here."
                }
                tone={status === "stale" ? "offline" : "empty"}
                actionLabel={status === "stale" ? "Try again" : "Open the editor"}
                onAction={status === "stale" ? onRetry : onCreate}
              />
            ) : (
              <CardGrid>
                {custom.map((choice) => (
                  <FormationCardButton
                    key={choice.id}
                    choice={choice}
                    selected={selectedId === choice.id}
                    onSelect={() => onSelect(choice.id)}
                    actions={
                      <MbMenu
                        label={`Actions for ${choice.name}`}
                        align="end"
                        items={[
                          { label: "Edit", icon: "edit", onSelect: () => onEdit(choice.id) },
                          { label: "Duplicate", icon: "copy", onSelect: () => onDuplicate(choice.id) },
                          { label: "Share", icon: "share", onSelect: () => onShare(choice.id) },
                          {
                            label: "Delete",
                            icon: "trash",
                            tone: "danger",
                            onSelect: () => onDelete(choice.id),
                          },
                        ]}
                      />
                    }
                  />
                ))}
              </CardGrid>
            )}
          </>
        )}
      </div>
    );
  }
);
FormationPicker.displayName = "FormationPicker";
