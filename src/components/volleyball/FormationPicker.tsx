"use client";

import { memo, type CSSProperties } from "react";
import { MbTabs } from "@/components/matchbook/Tabs";
import { MbMenu } from "@/components/matchbook/Menu";
import { MbSkeleton } from "@/components/matchbook/Skeleton";
import { MbCheckMark } from "@/components/matchbook/SelectList";
import { PanelEmpty } from "@/components/matchbook/Panel";
import { COURT_SVG } from "@/lib/volleyball/constants";
import type {
  MbFormationCategory,
  MbFormationChoice,
  MbFormationDot,
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

   THE CARD IS NOW THE KIT'S CHOICE CARD, drawn with the kit's own recipes —
   `.mb-tile` + `.mb-rail` + `.mb-row-hover`, the `--mb-rail-color` spine, the
   18px ballot box and `MbCheckMark`, the footer rule — i.e. the exact anatomy
   `MbChoiceCard` ships on `/competitions/new`. It was a hand-rolled bordered
   box that inverted to a solid navy fill on selection, which is a second
   "pick one of N" system in one product AND was the source of a contrast hard
   fail: `.mb-kicker` bakes `--mb-ink-muted` in unlayered CSS, so the
   `text-mb-paper-bright` on the "On court" confirmation never applied and it
   rendered at 2.44:1 on the navy fill. Nothing inverts now; every card sits on
   paper and the kicker measures 5.25:1 where it always should have.

   The one deliberate divergence from `MbChoiceCard` is the emblem: a formation
   is a SHAPE, so where the choice card puts a sprite disc this puts a court
   thumbnail of the rotation-1 receive frame. Same box, same position, same
   selection channels — an app that owns a court renderer should not describe
   five spatial arrangements in prose alone.
   =========================================================================== */

const CATEGORY_LABEL: Record<MbFormationCategory, string> = {
  builtin: "Built-in",
  starter: "Starters",
  custom: "My Formations",
};

/* Two columns, never three. At `xl` the Formation panel is a 7-of-12 column —
   about 700px — and three cards in it set the description at ~34 characters per
   line, under the 45-75 band (rubric 1.4). Two cards set it at ~52. */
const CardGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">{children}</div>
);

/* ------------------------------------------------------------ court thumbnail */

const THUMB = { w: 54, h: 42, pad: 1 } as const;

/**
 * The formation, at 54x42.
 *
 * Same drawing language as the full court: paper ground, navy boundary, teal
 * dashed 3 m line, filled disc = front row, hollow disc = back row. No
 * letterforms — at this size they would be noise, and the card's job is the
 * SHAPE, which is what the reader is choosing between.
 */
const FormationThumb = ({ dots }: { dots: MbFormationDot[] }) => {
  const innerW = THUMB.w - THUMB.pad * 2;
  const innerH = THUMB.h - THUMB.pad * 2;
  const attackY = THUMB.pad + (1 - COURT_SVG.ATTACK_LINE_Y) * innerH;
  return (
    <svg
      width={THUMB.w}
      height={THUMB.h}
      viewBox={`0 0 ${THUMB.w} ${THUMB.h}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x={THUMB.pad}
        y={THUMB.pad}
        width={innerW}
        height={innerH}
        fill="var(--mb-court-fill)"
        stroke="var(--mb-court-line-strong)"
        strokeWidth={1}
      />
      <line
        x1={THUMB.pad}
        y1={attackY}
        x2={THUMB.pad + innerW}
        y2={attackY}
        stroke="var(--mb-court-accent)"
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      {dots.map((dot) => (
        <circle
          key={dot.role}
          cx={THUMB.pad + dot.x * innerW}
          cy={THUMB.pad + (1 - dot.y) * innerH}
          r={3.6}
          fill={dot.back ? "var(--mb-court-fill)" : "var(--mb-court-line-strong)"}
          stroke="var(--mb-court-line-strong)"
          strokeWidth={1}
        />
      ))}
    </svg>
  );
};

/* ------------------------------------------------------------------ the card */

const FormationCard = ({
  choice,
  selected,
  onSelect,
  actions,
}: {
  choice: MbFormationChoice;
  selected: boolean;
  onSelect: () => void;
  actions?: React.ReactNode;
}) => {
  const style: CSSProperties = {};
  (style as Record<string, string>)["--mb-rail-color"] = selected
    ? "var(--mb-coral)"
    : "var(--mb-rule)";

  return (
    /* The card is the control and the overflow menu sits BESIDE it, never
       inside it: a button inside a button is invalid, and it is how the old
       card ended up with five 24px targets stacked in a 187px row. */
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        data-selected={selected}
        style={style}
        className="mb-tile mb-rail mb-row-hover flex h-full min-w-0 flex-1 flex-col items-start gap-2 rounded-[4px] p-3 pl-[1.05rem] text-left"
      >
        <span className="flex w-full items-start justify-between gap-2">
          <FormationThumb dots={choice.preview} />
          <span className="flex items-center gap-1.5">
            {selected && <span className="mb-kicker">On court</span>}
            <span
              aria-hidden="true"
              className={`inline-grid h-[18px] w-[18px] shrink-0 place-content-center rounded-[2px] border-[1.5px] ${
                selected
                  ? "border-mb-coral-deep bg-mb-coral-deep text-mb-paper-bright"
                  : "border-mb-navy"
              }`}
            >
              {selected && <MbCheckMark />}
            </span>
          </span>
        </span>

        <span className="matchbook-display w-full text-[0.95rem] font-bold leading-tight tracking-[0.05em] break-words">
          {choice.name}
        </span>

        {choice.description && (
          <span className="text-[0.72rem] leading-snug text-mb-ink-muted break-words">
            {choice.description}
          </span>
        )}
      </button>
      {actions && (
        <div className="flex shrink-0 items-start">{actions}</div>
      )}
    </div>
  );
};

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
                <FormationCard
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
                <p className="max-w-[52ch] text-[0.78rem] leading-snug text-mb-ink-muted">
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
                <FormationCard
                  key={choice.id}
                  choice={choice}
                  selected={selectedId === choice.id}
                  onSelect={() => onSelect(choice.id)}
                />
              ))}
            </CardGrid>
            <div className="border-t border-mb-rule px-4 py-3">
              <p className="mb-kicker">Starters</p>
              <p className="max-w-[52ch] text-[0.78rem] leading-snug text-mb-ink-muted">
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
              /* Skeleton at the FINAL geometry: two cards in the same grid,
                 same 132px card height, so the swap costs zero layout shift. */
              <CardGrid>
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 rounded-[4px] border border-mb-rule p-3"
                    style={{ height: 132 }}
                  >
                    <MbSkeleton w={54} h={42} />
                    <MbSkeleton w="60%" h={15} />
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
                  <FormationCard
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
