"use client";

/**
 * Dev-only primitive gallery. Not linked from the app.
 *
 * CONVENTION — several agents append to this file concurrently:
 *   1. Declare your group as its own component above `DevKitPage`, so your
 *      hooks stay inside it and never collide with anyone else's.
 *   2. Render it as a single line inside the marked list at the bottom.
 *   3. Never rewrite, reorder or touch a section you did not create.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "@/components/matchbook/Panel";
import { MbButton } from "@/components/matchbook/Button";
import { MbIconButton } from "@/components/matchbook/IconButton";
import { MbBadge, type MbBadgeTone } from "@/components/matchbook/Badge";
import { MbTabs } from "@/components/matchbook/Tabs";
import { MbSegmented } from "@/components/matchbook/Segmented";
import type { MbButtonSize, MbButtonVariant } from "@/components/matchbook/Button";
import type { MbIconButtonTone } from "@/components/matchbook/IconButton";
// W1 / P1 — shared logic modules & Panel extensions
import { MbIcon } from "@/components/matchbook/MbIcon";
import { PanelEmpty, TeamMark } from "@/components/matchbook/Panel";
import type { PanelEmptyTone } from "@/components/matchbook/Panel";
import {
  FORMAT_META,
  FORMAT_ORDER,
  hasAdvancedSettings,
} from "@/components/matchbook/formatMeta";
import { useMbReducedMotion } from "@/components/matchbook/useMbReducedMotion";
import { crestPath, type MbTeam } from "@/components/matchbook/types";
import { countOf, pluralise } from "@/lib/text";

// W1 / P1 — form kit
import {
  MbField,
  MbNumberStepper,
  MbSelect,
  MbSwatchPicker,
  MbTagInput,
  MbTextArea,
  MbTextInput,
  MbToggle,
  MbToggleChip,
  type MbSelectOption,
} from "@/components/matchbook/form";

// W1 / P1 — overlays & feedback
import { MbDialog, MbDialogBody, MbDialogFooter } from "@/components/matchbook/Dialog";
import { MbConfirm } from "@/components/matchbook/Confirm";
import { MbSheet } from "@/components/matchbook/Sheet";
import { MbNotice, type MbNoticeTone } from "@/components/matchbook/Notice";
import {
  MbEmptyState,
  type MbEmptyStateAction,
  type MbEmptyStateTone,
} from "@/components/matchbook/EmptyState";
import { MbSkeleton } from "@/components/matchbook/Skeleton";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

// W1 / P1 — score & status display
import { MbStat, type MbStatTone } from "@/components/matchbook/Stat";
import { MbMeter } from "@/components/matchbook/Meter";
import {
  MbScoreNumeral,
  type MbScoreNumeralSize,
} from "@/components/matchbook/ScoreNumeral";
import { MbScoreboardHero } from "@/components/matchbook/ScoreboardHero";
import { MbFinalStamp } from "@/components/matchbook/FinalStamp";
import {
  MbLiveStatus,
  type MbLiveStatusValue,
} from "@/components/matchbook/LiveStatus";
import { MbDangerZone } from "@/components/matchbook/DangerZone";

// W1 / P1 — selection & list display
import { MbChoiceCard } from "@/components/matchbook/ChoiceCard";
import { MbStepRail, type MbStep } from "@/components/matchbook/StepRail";
import {
  MbSelectList,
  type MbSelectColumn,
} from "@/components/matchbook/SelectList";
import { MbReorderList, mbReorder } from "@/components/matchbook/ReorderList";

// W1 / P1 — action & sharing controls
import { MbCopyField } from "@/components/matchbook/CopyField";
import { MbShareAction, type MbShareOutcome } from "@/components/matchbook/ShareAction";
import { MbMenu, type MbMenuItem } from "@/components/matchbook/Menu";
import {
  MbActionBar,
  MB_ACTION_BAR_H,
  MB_ACTION_BAR_H_STACKED,
  type MbAction,
} from "@/components/matchbook/ActionBar";

/* ===================================================================== */
/* W1 / P1 — Core controls                                               */
/* ===================================================================== */

const BUTTON_VARIANTS: MbButtonVariant[] = ["coral", "navy", "outline", "outline-navy"];
const BUTTON_SIZES: MbButtonSize[] = ["sm", "md", "lg", "touch"];

/** What each size actually resolves to, so the row is checkable by eye. */
const BUTTON_SIZE_NOTE: Record<MbButtonSize, string> = {
  sm: "44px box, display/link label (0.72rem)",
  md: "44px box, display/button label (0.8rem)",
  lg: "47.6px box, 0.9rem label",
  touch: "44px box — the explicit opt-in name; same as md",
};
const ICON_TONES: MbIconButtonTone[] = ["plain", "navy", "coral", "outline", "outline-navy"];
const BADGE_TONES: MbBadgeTone[] = [
  "live",
  "draft",
  "final",
  "win",
  "loss",
  "neutral",
  "teal",
  "guest",
  "warn",
];

const KitBlock = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="border-t border-mb-rule px-4 py-4 first:border-t-0">
    <p className="mb-kicker mb-3 tabular-nums">{label}</p>
    {children}
  </div>
);

const CoreControlsSection = () => {
  const [tab, setTab] = useState("bracket");
  const [round, setRound] = useState("r3");
  const [long, setLong] = useState("rotations");
  const [urlTab, setUrlTab] = useState("list");
  const [pair, setPair] = useState("bracket");
  const [mode, setMode] = useState("rally");
  const [serve, setServe] = useState("serving");
  const [slot, setSlot] = useState("s1");
  const [venue, setVenue] = useState("north");

  return (
    <section id="w1-p1-core-controls" className="mt-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-mb-navy pb-2">
        <h2 className="matchbook-display text-2xl font-bold leading-none tracking-[0.05em]">
          Core <span className="text-mb-coral">Controls</span>
        </h2>
        <p className="mb-kicker tabular-nums">
          W1 / P1 — MbButton · MbIconButton · MbBadge · MbTabs · MbSegmented
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* ---------------------------------------------------- MbButton */}
        <div className="xl:col-span-7">
          <Panel title="MbButton" icon="check" meta={<span className="mb-kicker tabular-nums">4 variants</span>}>
            {BUTTON_SIZES.map((size) => (
              <KitBlock key={size} label={`size="${size}" — ${BUTTON_SIZE_NOTE[size]}`}>
                <div className="flex flex-wrap items-center gap-3">
                  {BUTTON_VARIANTS.map((variant) => (
                    <MbButton key={variant} variant={variant} size={size} icon="plus">
                      {variant}
                    </MbButton>
                  ))}
                </div>
              </KitBlock>
            ))}

            <KitBlock label="Icon slots">
              <div className="flex flex-wrap items-center gap-3">
                <MbButton variant="navy" icon="export">
                  Leading
                </MbButton>
                <MbButton variant="navy" iconRight="chevron-right">
                  Trailing
                </MbButton>
                <MbButton variant="navy" icon="filter" iconRight="chevron-down">
                  Both
                </MbButton>
                <MbButton variant="outline-navy">No icon</MbButton>
              </div>
            </KitBlock>

            <KitBlock label="States — disabled, loading, full width, overflow">
              <div className="flex flex-wrap items-center gap-3">
                <MbButton variant="coral" icon="save" disabled>
                  Disabled
                </MbButton>
                <MbButton variant="navy" disabled>
                  Disabled
                </MbButton>
                <MbButton variant="outline" icon="trash" disabled>
                  Disabled
                </MbButton>
                <MbButton variant="coral" loading>
                  Saving
                </MbButton>
                <MbButton variant="outline-navy" loading>
                  Syncing
                </MbButton>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MbButton variant="coral" fullWidth icon="quick">
                  Full width
                </MbButton>
                <div className="max-w-[220px]">
                  <MbButton variant="navy" fullWidth icon="calendar">
                    Reschedule the Saturday evening fixture
                  </MbButton>
                </div>
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted tabular-nums">
                Every size clears 44px. Loading keeps focus, blocks activation — including
                a type=&quot;submit&quot; post — and never animates: the glyph is static and
                the present-participle label is what says &ldquo;in progress&rdquo;. Disabled
                is the shipped recipe from design language §4.3, unchanged.
              </p>
            </KitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------ MbIconButton */}
        <div className="xl:col-span-5">
          <Panel title="MbIconButton" icon="more" meta={<span className="mb-kicker tabular-nums">44 / 56</span>}>
            <KitBlock label='size="md" — 44 x 44'>
              <div className="flex flex-wrap items-center gap-3">
                {ICON_TONES.map((tone) => (
                  <MbIconButton key={tone} tone={tone} icon="close" label={`Close (${tone})`} />
                ))}
              </div>
            </KitBlock>

            <KitBlock label='size="lg" — 56 x 56'>
              <div className="flex flex-wrap items-center gap-3">
                {ICON_TONES.map((tone) => (
                  <MbIconButton
                    key={tone}
                    tone={tone}
                    size="lg"
                    icon="undo"
                    label={`Undo (${tone})`}
                  />
                ))}
              </div>
            </KitBlock>

            <KitBlock label="Vocabulary">
              <div className="flex flex-wrap items-center gap-3">
                <MbIconButton icon="edit" label="Edit match" />
                <MbIconButton icon="copy" label="Copy link" />
                <MbIconButton icon="share" label="Share" />
                <MbIconButton icon="print" label="Print" />
                <MbIconButton icon="expand" label="Expand" />
                <MbIconButton icon="more" label="More actions" />
                <MbIconButton icon="trash" label="Delete team" tone="outline" />
              </div>
            </KitBlock>

            <KitBlock label="Disabled">
              <div className="flex flex-wrap items-center gap-3">
                <MbIconButton icon="undo" label="Undo point" disabled />
                <MbIconButton icon="chevron-left" label="Previous round" tone="navy" disabled />
                <MbIconButton icon="refresh" label="Retry" tone="outline-navy" disabled />
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted tabular-nums">
                Every one carries both <code>title</code> and <code>aria-label</code> from the
                required <code>label</code> prop.
              </p>
            </KitBlock>

            <KitBlock label="In place — panel header and action rail">
              <div className="mb-tile flex items-center justify-between gap-2 rounded-[3px] px-2 py-2">
                <span className="matchbook-display min-w-0 truncate px-1.5 text-[0.9rem] font-bold">
                  Harbor Classic
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <MbIconButton icon="share" label="Share competition" />
                  <MbIconButton icon="more" label="More competition actions" />
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <MbIconButton icon="chevron-left" label="Previous round" tone="outline-navy" />
                <span className="matchbook-display flex-1 text-center text-[0.9rem] font-bold tabular-nums">
                  Round 3 of 7
                </span>
                <MbIconButton icon="chevron-right" label="Next round" tone="outline-navy" />
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted tabular-nums">
                8px between neighbours, 44px each — the two numbers the sweep checks.
              </p>
            </KitBlock>
          </Panel>
        </div>

        {/* ----------------------------------------------------- MbBadge */}
        <div className="xl:col-span-7">
          <Panel title="MbBadge" icon="live" meta={<span className="mb-kicker tabular-nums">9 tones</span>}>
            <div className="overflow-x-auto px-4 py-4">
              <table className="mb-table w-full border-collapse">
                <caption className="mb-kicker pb-2 text-left">
                  Tone x variant — size sm (left) and md (right)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Tone</th>
                    <th scope="col">Text</th>
                    <th scope="col">Framed</th>
                    <th scope="col">Solid</th>
                  </tr>
                </thead>
                <tbody>
                  {BADGE_TONES.map((tone) => (
                    <tr key={tone}>
                      <td className="matchbook-display text-[0.72rem] font-semibold tracking-[0.08em]">
                        {tone}
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <MbBadge tone={tone}>{tone}</MbBadge>
                          <MbBadge tone={tone} size="md">
                            {tone}
                          </MbBadge>
                        </span>
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <MbBadge tone={tone} variant="framed">
                            {tone}
                          </MbBadge>
                          <MbBadge tone={tone} variant="framed" size="md">
                            {tone}
                          </MbBadge>
                        </span>
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <MbBadge tone={tone} variant="solid">
                            {tone}
                          </MbBadge>
                          <MbBadge tone={tone} variant="solid" size="md">
                            {tone}
                          </MbBadge>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <KitBlock label="In place">
              <div className="flex flex-wrap items-center gap-3">
                <MbBadge tone="live" variant="solid">
                  Live
                </MbBadge>
                <MbBadge tone="final" variant="framed">
                  Final
                </MbBadge>
                <MbBadge tone="draft" variant="framed">
                  Draft
                </MbBadge>
                <MbBadge tone="guest">Guest</MbBadge>
                <MbBadge tone="warn" variant="framed">
                  Needs 2 more teams
                </MbBadge>
                <MbBadge tone="neutral">Round 3 of 7</MbBadge>
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted tabular-nums">
                <code>solid</code> is permitted for <code>live</code> only — every other tone
                degrades to <code>framed</code>, which is why the Solid column above reads as
                frames. Letterforms stay navy; the tone rides the dot, the square or the rule.
              </p>
            </KitBlock>

            <KitBlock label="Edge cases — long label, numerals, truncating row">
              <div className="flex flex-col gap-2.5">
                <div className="mb-tile flex items-center gap-2 rounded-[3px] px-3 py-2">
                  <span className="matchbook-display min-w-0 flex-1 truncate text-[0.85rem] font-bold">
                    Northside Community Volleyball Association
                  </span>
                  <MbBadge tone="live" variant="solid" className="shrink-0">
                    Live
                  </MbBadge>
                </div>
                <div className="mb-tile flex items-center gap-2 rounded-[3px] px-3 py-2">
                  <span className="matchbook-display min-w-0 flex-1 truncate text-[0.85rem] font-bold">
                    Harbor Classic
                  </span>
                  <MbBadge tone="neutral" className="shrink-0">
                    12 of 120
                  </MbBadge>
                </div>
                <div className="max-w-[220px] overflow-hidden">
                  <MbBadge tone="warn" variant="framed">
                    Waiting on 3 results before the bracket can advance
                  </MbBadge>
                </div>
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted tabular-nums">
                The badge never wraps and never shrinks; the row truncates around it. A label
                longer than its box is clipped by the caller rather than breaking a status word
                across two lines — which is the argument for keeping them to three words.
              </p>
            </KitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------------ MbTabs */}
        <div className="xl:col-span-5">
          <Panel title="MbTabs" icon="bracket" meta={<span className="mb-kicker">roving tabindex</span>}>
            <KitBlock label="Icons + counts">
              <MbTabs
                value={tab}
                onValueChange={setTab}
                items={[
                  { value: "bracket", label: "Bracket", icon: "bracket", count: 15 },
                  { value: "standings", label: "Standings", icon: "chart", count: 8 },
                  { value: "schedule", label: "Schedule", icon: "calendar", count: 120 },
                ]}
              />
              <p className="mt-3 text-[0.85rem]">
                Selected: <span className="matchbook-display font-bold tracking-[0.06em]">{tab}</span>
              </p>
            </KitBlock>

            <KitBlock label="Two tabs, no icons">
              <MbTabs
                value={pair}
                onValueChange={setPair}
                items={[
                  { value: "bracket", label: "Winners" },
                  { value: "losers", label: "Losers" },
                ]}
              />
            </KitBlock>

            <KitBlock label="Overflow — scrolls, hairline marks the cut">
              <MbTabs
                aria-label="Round"
                value={round}
                onValueChange={setRound}
                items={Array.from({ length: 9 }, (_, i) => ({
                  value: `r${i + 1}`,
                  label: `Round ${i + 1}`,
                  count: 12 - i,
                }))}
              />
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted tabular-nums">
                Round 3 starts selected and is scrolled into view rather than left off
                screen; a 1.5px navy rule appears on whichever edge still has tabs behind
                it. No gradient fade — invariant 24 bans them.
              </p>
            </KitBlock>

            <KitBlock label="Long labels — never wrap, never squeeze">
              <MbTabs
                aria-label="Section"
                value={long}
                onValueChange={setLong}
                items={[
                  { value: "overview", label: "Overview" },
                  { value: "rotations", label: "Serve receive rotations" },
                  { value: "settings", label: "Competition settings" },
                ]}
              />
            </KitBlock>

            <KitBlock label="urlKey — the value is mirrored into the query string">
              <MbTabs
                aria-label="View"
                urlKey="kit-view"
                value={urlTab}
                onValueChange={setUrlTab}
                items={[
                  { value: "list", label: "List", icon: "history" },
                  { value: "grid", label: "Grid", icon: "grid" },
                ]}
              />
            </KitBlock>

            <KitBlock label="Empty">
              <MbTabs value="" onValueChange={() => {}} items={[]} />
              <p className="text-[0.72rem] text-mb-ink-muted">
                No items renders nothing — a control with no choices paints no chrome.
              </p>
            </KitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------- MbSegmented */}
        <div className="xl:col-span-12">
          <Panel
            title="MbSegmented"
            icon="grid"
            meta={<span className="mb-kicker">radiogroup</span>}
          >
            <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-12">
              <div className="xl:col-span-4">
                <p className="mb-kicker mb-3 tabular-nums">size=&quot;md&quot; — 48px, icons</p>
                <MbSegmented
                  name="kit-mode"
                  value={mode}
                  onChange={setMode}
                  aria-label="Scoring mode"
                  options={[
                    { value: "classic", label: "Classic", icon: "clock" },
                    { value: "rally", label: "Rally", icon: "quick" },
                    { value: "timed", label: "Timed", icon: "calendar" },
                  ]}
                  columns={{ base: 1, sm: 3 }}
                />
                <p className="mt-3 text-[0.85rem]">
                  Selected:{" "}
                  <span className="matchbook-display font-bold tracking-[0.06em]">{mode}</span>
                </p>
              </div>

              <div className="xl:col-span-4">
                <p className="mb-kicker mb-3 tabular-nums">size=&quot;sm&quot; — 44px, fullWidth={"{false}"}</p>
                <MbSegmented
                  name="kit-serve"
                  value={serve}
                  onChange={setServe}
                  size="sm"
                  fullWidth={false}
                  aria-label="Rotation phase"
                  options={[
                    { value: "serving", label: "Serving" },
                    { value: "receiving", label: "Receiving" },
                  ]}
                />
                <p className="mt-3 text-[0.72rem] text-mb-ink-muted tabular-nums">
                  Shrinks to its content instead of stretching; the 1.5px navy gaps are the
                  dividing rules.
                </p>
              </div>

              <div className="xl:col-span-4">
                <p className="mb-kicker mb-3 tabular-nums">Long labels — wraps, never truncates</p>
                <div className="max-w-[260px]">
                  <MbSegmented
                    name="kit-venue"
                    value={venue}
                    onChange={setVenue}
                    aria-label="Venue"
                    options={[
                      { value: "north", label: "North Pavilion Court" },
                      { value: "south", label: "South Hall" },
                    ]}
                    columns={{ base: 1, sm: 2 }}
                  />
                </div>
              </div>

              <div className="xl:col-span-12">
                <p className="mb-kicker mb-3 tabular-nums">
                  Six options — wraps to 3 x 2 below sm, one row above
                </p>
                <MbSegmented
                  name="kit-slot"
                  value={slot}
                  onChange={setSlot}
                  aria-label="Rotation slot"
                  options={Array.from({ length: 6 }, (_, i) => ({
                    value: `s${i + 1}`,
                    label: `R${i + 1}`,
                  }))}
                  columns={{ base: 3, sm: 6 }}
                />
              </div>

              <div className="xl:col-span-12">
                <p className="mb-kicker mb-3 tabular-nums">Empty</p>
                <MbSegmented name="kit-empty" value="" onChange={() => {}} options={[]} />
                <p className="text-[0.72rem] text-mb-ink-muted">
                  No options renders nothing, same contract as MbTabs.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
};

/* ===================================================================== */
/* W1 / P1 — Shared logic modules & Panel extensions                     */
/* ===================================================================== */

const LOGIC_TEAM: MbTeam = { name: "Harbor Surge", crest: crestPath("surge") };
const LOGIC_TEAM_AWAY: MbTeam = { name: "Riptide", crest: crestPath("riptide") };
const LOGIC_TEAM_LONG: MbTeam = {
  name: "Northside Community Volleyball Association",
  crest: crestPath("storm"),
};

const LOGIC_PLURAL_CASES = [
  "court",
  "pitch",
  "box",
  "alley",
  "penalty",
  "half",
  "series",
  // Multi-word: only the LAST word pluralises, so "half court" must not become
  // "halves court" even though "half" on its own does.
  "half court",
];

/** How many of the cases the naive `word + "s"` gets wrong. Derived, never typed. */
const LOGIC_PLURAL_WRONG = LOGIC_PLURAL_CASES.filter(
  (word) => `${word}s` !== pluralise(word)
).length;

const LOGIC_EMPTY_CASES: { tone: PanelEmptyTone; message: string }[] = [
  {
    tone: "empty",
    message: "No results exist yet — finished matches will be recorded here.",
  },
  {
    tone: "notfound",
    message: "No competition matches that share code — check the link and try again.",
  },
  {
    tone: "error",
    message: "Saved formations could not be loaded right now — try again from My Formations.",
  },
  {
    tone: "offline",
    message: "You are offline — these standings were last updated eleven minutes ago.",
  },
  {
    tone: "denied",
    message: "This session is view only — ask the organiser for an admin link to edit it.",
  },
  {
    tone: "unconfigured",
    message: "Sharing is not set up yet — connect a session to publish live scores.",
  },
];

const LogicRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex min-w-0 flex-col gap-2">
    <span className="mb-kicker">{label}</span>
    {children}
  </div>
);

/** Support flag: colour plus a filled/hollow square, never colour alone. */
const LogicFlag = ({ on, label }: { on: boolean; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span
      className="mb-form-square"
      style={{ background: on ? "var(--mb-green)" : "var(--mb-tint-3)" }}
    />
    <span
      className={`matchbook-display text-[0.66rem] font-bold tracking-[0.1em] ${
        on ? "text-mb-navy" : "text-mb-ink-muted"
      }`}
    >
      {label}
    </span>
  </span>
);

const LogicAndPanelSection = () => {
  const [count, setCount] = useState(2);
  const [venue, setVenue] = useState("pitch");
  const [actionLog, setActionLog] = useState("None yet");
  const reducedMotion = useMbReducedMotion();
  const venueWord = venue.trim() === "" ? "court" : venue;

  return (
    <section id="w1-p1-logic-and-panel" className="mt-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-mb-navy pb-2">
        <h2 className="matchbook-display text-2xl font-bold leading-none tracking-[0.05em]">
          Shared <span className="text-mb-coral">Logic</span>
        </h2>
        <p className="mb-kicker">
          W1 / P1 — FORMAT_META · pluralise · useMbReducedMotion · PanelEmpty · TeamMark
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* -------------------------------------------------- FORMAT_META */}
        <div className="xl:col-span-12">
          <Panel
            title="FORMAT_META"
            icon="clipboard"
            meta={
              <span className="mb-kicker hidden tabular-nums sm:inline">
                5 formats, 4 accents — the bracket pair shares one
              </span>
            }
          >
            {FORMAT_ORDER.map((type) => {
              const meta = FORMAT_META[type];
              return (
                <div
                  key={type}
                  className="mb-rail mb-row-hover flex items-start gap-3 border-t border-mb-rule px-4 py-3.5 first:border-t-0"
                  style={{ "--mb-rail-color": meta.accent } as React.CSSProperties}
                >
                  <span className="mb-icon-disc mt-px h-9 w-9">
                    <MbIcon id={meta.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <span className="matchbook-display text-[0.9rem] font-bold">
                        {meta.label}
                      </span>
                      <span className="matchbook-display text-[0.66rem] font-bold tracking-[0.1em] text-mb-ink-muted tabular-nums">
                        {countOf(meta.minTeams, "team")} minimum
                      </span>
                    </div>
                    <p className="mt-1 text-[0.78rem] text-mb-ink-muted">{meta.blurb}</p>
                    <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5">
                      <LogicFlag on={meta.supports.series} label="Series" />
                      <LogicFlag on={meta.supports.courts} label="Venues" />
                      <LogicFlag on={meta.supports.scoringMode} label="Scoring" />
                      <LogicFlag on={meta.supports.standingsPoints} label="Points" />
                      <LogicFlag on={hasAdvancedSettings(type)} label="Advanced" />
                    </div>
                  </div>
                </div>
              );
            })}
          </Panel>
        </div>

        {/* ------------------------------------------------- src/lib/text */}
        <div className="xl:col-span-7">
          <Panel title="pluralise()" icon="edit">
            <div className="flex flex-col gap-4 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LogicRow label="Venue word">
                  {/* min-h on the INPUT, not the wrapper: the wrapper's padding
                      is not a hit area, so the field itself has to carry 44px. */}
                  <div className="mb-input py-0!">
                    <input
                      type="text"
                      className="min-h-[44px]"
                      value={venue}
                      onChange={(event) => setVenue(event.target.value)}
                      aria-label="Venue word"
                      placeholder="court"
                    />
                  </div>
                </LogicRow>

                <LogicRow label="Count">
                  <div className="mb-stepper self-start">
                    <button
                      type="button"
                      onClick={() => setCount((n) => Math.max(0, n - 1))}
                      title="Decrease count"
                      aria-label="Decrease count"
                      disabled={count === 0}
                    >
                      <MbIcon id="minus" size={14} />
                    </button>
                    <span className="mb-stepper-value">{count}</span>
                    <button
                      type="button"
                      onClick={() => setCount((n) => Math.min(24, n + 1))}
                      title="Increase count"
                      aria-label="Increase count"
                      disabled={count === 24}
                    >
                      <MbIcon id="plus" size={14} />
                    </button>
                  </div>
                </LogicRow>
              </div>

              <div className="mb-tile rounded-[3px] px-3.5 py-3">
                <p className="matchbook-display text-2xl font-bold leading-none tabular-nums">
                  {countOf(count, venueWord)}
                </p>
                <p className="mt-1.5 text-[0.72rem] text-mb-ink-muted">
                  terminology.venuePlural = {pluralise(venueWord)}
                </p>
              </div>

              <table className="mb-table mb-table-compact w-full">
                <caption className="sr-only">
                  Pluralisation rules against the naive suffix
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Singular</th>
                    <th scope="col">pluralise()</th>
                    <th scope="col">word + s</th>
                  </tr>
                </thead>
                <tbody>
                  {LOGIC_PLURAL_CASES.map((word) => {
                    const naive = `${word}s`;
                    const correct = pluralise(word);
                    const wrong = naive !== correct;
                    return (
                      <tr key={word}>
                        <td>{word}</td>
                        <td className="matchbook-display font-semibold">{correct}</td>
                        {/* Wrongness rides a strike-through as well as the ink,
                            so it survives a desaturated screenshot (§4.13). */}
                        <td
                          className={
                            wrong ? "text-mb-red line-through" : "text-mb-ink-muted"
                          }
                        >
                          {naive}
                          {wrong && <span className="sr-only"> — wrong</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className="text-[0.72rem] tabular-nums text-mb-ink-muted">
                Struck through: <code>word + &quot;s&quot;</code> is wrong (
                {LOGIC_PLURAL_WRONG} of {LOGIC_PLURAL_CASES.length}).
              </p>
            </div>
          </Panel>
        </div>

        {/* --------------------------------------- useMbReducedMotion() */}
        <div className="xl:col-span-5">
          <Panel title="useMbReducedMotion()" icon="live">
            <div className="flex flex-col gap-3 p-4">
              <div className="mb-tile flex items-center gap-3 rounded-[3px] px-3.5 py-3">
                <span className="mb-icon-disc h-11 w-11">
                  {/* One constant mark. The value word is the state; swapping the
                      glyph too would imply two independent signals. */}
                  <MbIcon id="refresh" size={20} />
                </span>
                <div className="min-w-0">
                  <p className="matchbook-display text-2xl font-bold leading-none">
                    {reducedMotion ? "Reduce" : "No preference"}
                  </p>
                  <p className="mt-1 text-[0.72rem] text-mb-ink-muted">
                    prefers-reduced-motion
                  </p>
                </div>
              </div>
              <p className="text-[0.78rem] text-mb-ink-muted">
                Read through useSyncExternalStore, so the first client render already
                holds the real value — a useState + useEffect version renders false once,
                which is exactly the frame of motion invariant 44 forbids. Zero
                framer-motion import (charter D-17).
              </p>
            </div>
          </Panel>
        </div>

        {/* ------------------------------------------ PanelEmpty tones */}
        {LOGIC_EMPTY_CASES.map(({ tone, message }, i) => (
          <div key={tone} className="xl:col-span-4">
            <Panel title={`PanelEmpty ${tone}`}>
              <PanelEmpty
                message={message}
                tone={tone}
                actionLabel={i % 2 === 0 ? "Browse teams" : "Try again"}
                href={i % 2 === 0 ? "/teams" : undefined}
                onAction={i % 2 === 0 ? undefined : () => setActionLog(tone)}
              />
            </Panel>
          </div>
        ))}

        <div className="xl:col-span-4">
          <Panel title="PanelEmpty — no action">
            <PanelEmpty message="No teams match “northside community volleyball”." />
          </Panel>
        </div>

        <div className="xl:col-span-4">
          <Panel title="PanelEmpty — long copy, custom icon">
            <PanelEmpty
              tone="error"
              icon="cloud"
              message="The scoreboard could not reach the live session, the last three attempts each timed out after fifteen seconds, and nothing has been saved since the second set."
              actionLabel="Retry connection"
              onAction={() => setActionLog("long copy")}
            />
          </Panel>
        </div>

        <div className="xl:col-span-4">
          <Panel title="onAction" tone="navy">
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-4">
              <span className="mb-kicker">Last handler fired</span>
              <span className="matchbook-display text-2xl font-bold leading-none">
                {actionLog}
              </span>
            </div>
          </Panel>
        </div>

        {/* ---------------------------------------------------- TeamMark */}
        <div className="xl:col-span-12">
          <Panel
            title="TeamMark"
            icon="teams"
            meta={
              <span className="mb-kicker hidden sm:inline">
                Accent is a 3px bar, never a fill
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <LogicRow label="size sm / md / lg">
                <div className="flex flex-col items-start gap-2.5">
                  <TeamMark team={LOGIC_TEAM} size="sm" />
                  <TeamMark team={LOGIC_TEAM} size="md" />
                  <TeamMark team={LOGIC_TEAM} size="lg" />
                </div>
              </LogicRow>

              <LogicRow label="numeric sizes still work">
                <div className="flex flex-col items-start gap-2.5">
                  <TeamMark team={LOGIC_TEAM_AWAY} size={18} />
                  <TeamMark team={LOGIC_TEAM_AWAY} />
                  <TeamMark team={LOGIC_TEAM_AWAY} size={32} />
                </div>
              </LogicRow>

              <LogicRow label="accent bar">
                <div className="flex flex-col items-start gap-2.5">
                  <TeamMark team={LOGIC_TEAM} size="sm" accent="var(--mb-teal)" />
                  <TeamMark team={LOGIC_TEAM} size="md" accent="var(--mb-plum)" />
                  <TeamMark team={LOGIC_TEAM} size="lg" accent="var(--mb-gold)" />
                </div>
              </LogicRow>

              <LogicRow label="reverse — away side">
                <div className="flex flex-col gap-2.5">
                  <TeamMark team={LOGIC_TEAM_AWAY} size="md" reverse className="justify-end" />
                  <TeamMark
                    team={LOGIC_TEAM_AWAY}
                    size="md"
                    reverse
                    accent="var(--mb-teal)"
                    className="justify-end"
                  />
                  <TeamMark
                    team={LOGIC_TEAM_AWAY}
                    size="lg"
                    reverse
                    accent="var(--mb-plum)"
                    className="justify-end"
                  />
                </div>
              </LogicRow>

              <LogicRow label="orientation vertical">
                <div className="flex items-start gap-5">
                  <TeamMark team={LOGIC_TEAM} size="lg" orientation="vertical" />
                  <TeamMark
                    team={LOGIC_TEAM_AWAY}
                    size="lg"
                    orientation="vertical"
                    accent="var(--mb-plum)"
                  />
                  <TeamMark
                    team={LOGIC_TEAM}
                    size="md"
                    orientation="vertical"
                    reverse
                    accent="var(--mb-teal)"
                  />
                </div>
              </LogicRow>

              <LogicRow label="overflow truncates">
                <div className="flex flex-col gap-2.5">
                  <TeamMark
                    team={LOGIC_TEAM_LONG}
                    size="md"
                    accent="var(--mb-gold)"
                    className="w-[180px]"
                  />
                  <TeamMark
                    team={LOGIC_TEAM_LONG}
                    size="sm"
                    orientation="vertical"
                    accent="var(--mb-teal)"
                    className="w-[104px]"
                  />
                </div>
              </LogicRow>

              <LogicRow label="scoreline — 1fr auto 1fr">
                <div className="mb-scoreline items-center gap-3">
                  <TeamMark
                    team={LOGIC_TEAM}
                    size="sm"
                    accent="var(--mb-teal)"
                    className="min-w-0"
                  />
                  <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">
                    25–19
                  </span>
                  <TeamMark
                    team={LOGIC_TEAM_LONG}
                    size="sm"
                    reverse
                    accent="var(--mb-plum)"
                    className="min-w-0 justify-end"
                  />
                </div>
              </LogicRow>

              <LogicRow label="crest-only fallback">
                <div className="flex flex-col items-start gap-2.5">
                  <TeamMark team={{ name: "TBD", crest: crestPath("apex") }} size="md" />
                  <TeamMark
                    team={{ name: "Bye", crest: crestPath("peak") }}
                    size="md"
                    accent="var(--mb-ink-muted)"
                  />
                </div>
              </LogicRow>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
};

/* ===================================================================== */
/* W1 / P1 — Form kit                                                    */
/* ===================================================================== */

const FORMAT_OPTIONS: MbSelectOption[] = [
  { value: "round_robin", label: "Round robin" },
  { value: "single_elimination", label: "Single elimination" },
  { value: "double_elimination", label: "Double elimination" },
  { value: "win2out", label: "Win two, stay on" },
  { value: "two_match_rotation", label: "Two-match rotation" },
];

const VENUE_OPTIONS: MbSelectOption[] = [
  { value: "north", label: "North Beach Sand Court Number Three" },
  { value: "pier", label: "Pier Pavilion" },
  { value: "closed", label: "Boardwalk (closed for resurfacing)", disabled: true },
];

const LONG_NAME =
  "Harbourside Invitational Autumn Classic — Division Two Qualifier";

const FormBlock = ({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) => (
  <div className="border-t border-mb-rule px-4 py-4 first:border-t-0">
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="mb-kicker">{label}</p>
      {note && (
        <p className="min-w-0 text-[0.72rem] tabular-nums text-mb-ink-muted">
          {note}
        </p>
      )}
    </div>
    {children}
  </div>
);

const FormKitSection = () => {
  const [name, setName] = useState("Summer League");
  const [search, setSearch] = useState("");
  const [longName, setLongName] = useState(LONG_NAME);
  const [code, setCode] = useState("summer league!!");
  const [notes, setNotes] = useState(
    "Nets down by 21:00. Two balls per court; the spare lives with the scorer.",
  );
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState("round_robin");
  const [venue, setVenue] = useState("");

  const [points, setPoints] = useState(21);
  const [games, setGames] = useState(3);
  const [rotation, setRotation] = useState(1);
  const [courts, setCourts] = useState(1);
  const [seed, setSeed] = useState(48);

  const [ties, setTies] = useState(true);
  const [libero, setLibero] = useState(false);
  const [ranked, setRanked] = useState(true);

  const [overlaps, setOverlaps] = useState(true);
  const [arrows, setArrows] = useState(false);
  const [zones, setZones] = useState(true);
  const [wide, setWide] = useState(false);

  const [teamColour, setTeamColour] = useState("var(--mb-teal)");
  const [customColour, setCustomColour] = useState("var(--mb-coral)");

  const [longNotes, setLongNotes] = useState(
    "Overflow rule: the shell never grows sideways. Rain plan — if the sand is unplayable by 18:30 the round is pushed to the indoor hall on Third Street, the schedule shifts by ninety minutes and every captain is notified through the share link rather than by phone.",
  );
  const [courtSel, setCourtSel] = useState("c1");
  const [roundSel, setRoundSel] = useState("r2");
  /**
   * The one hex literal in this file, and it is *data*, not styling: it stands
   * in for a team colour a user picked through `allowCustom`, which is the only
   * way an off-palette value can exist (charter D-9). It paints nothing but a
   * swatch face and a 3px accent bar.
   */
  const [hexColour, setHexColour] = useState("#3F7D6B");
  const [filters, setFilters] = useState<string[]>(["upsets", "finals"]);

  const [tags, setTags] = useState(["beach", "doubles"]);
  const [emptyTags, setEmptyTags] = useState<string[]>([]);
  const [fullTags, setFullTags] = useState([
    "seeded",
    "Federation sanctioned qualifier",
    "sand",
  ]);

  return (
    <section id="w1-p1-form-kit" className="mt-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-mb-navy pb-2">
        <h2 className="matchbook-display text-2xl font-bold leading-none tracking-[0.05em]">
          Form <span className="text-mb-coral">Kit</span>
        </h2>
        <p className="mb-kicker">
          W1 / P1 — MbField · MbTextInput · MbTextArea · MbSelect ·
          MbNumberStepper · MbToggle · MbToggleChip · MbSwatchPicker · MbTagInput
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* ------------------------------------ MbField + MbTextInput */}
        <div className="xl:col-span-7">
          <Panel
            title="MbField · MbTextInput"
            icon="edit"
            meta={
              <span className="mb-kicker tabular-nums">48px tall</span>
            }
          >
            <FormBlock label="label + hint" note="hint wired to aria-describedby">
              <MbField
                label="Competition name"
                htmlFor="fk-name"
                hint="Shown on the scoreboard and every share link."
              >
                <MbTextInput
                  id="fk-name"
                  value={name}
                  placeholder="Summer League"
                  onChange={(event) => setName(event.target.value)}
                />
              </MbField>
            </FormBlock>

            <FormBlock label="required + icon + trailing" note="leading glyph, live counter">
              <MbField
                label="Find a team"
                htmlFor="fk-search"
                required
                hint="Matches on team name and player names."
              >
                <MbTextInput
                  id="fk-search"
                  icon="search"
                  value={search}
                  placeholder="Riptide"
                  onChange={(event) => setSearch(event.target.value)}
                  trailing={
                    <span className="mb-kicker shrink-0 tabular-nums">
                      {search.length}/24
                    </span>
                  }
                />
              </MbField>
            </FormBlock>

            <FormBlock label="error" note="aria-invalid + role=alert">
              <MbField
                label="Share code"
                htmlFor="fk-code"
                error="Use letters, numbers and dashes only — no spaces."
                hint="People type this to join."
              >
                <MbTextInput
                  id="fk-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </MbField>
            </FormBlock>

            <FormBlock label="long value" note="62 characters, no reflow">
              <MbField label="Event title" htmlFor="fk-long">
                <MbTextInput
                  id="fk-long"
                  value={longName}
                  onChange={(event) => setLongName(event.target.value)}
                />
              </MbField>
            </FormBlock>

            <FormBlock label="disabled" note="inherited from a locked competition">
              <MbField
                label="Season"
                htmlFor="fk-season"
                hint="Set when the season was created."
              >
                <MbTextInput id="fk-season" value="2026 / Spring" disabled readOnly />
              </MbField>
            </FormBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------ MbTextArea */}
        <div className="xl:col-span-5">
          <Panel title="MbTextArea" icon="clipboard">
            <FormBlock label="default" note="resize: vertical only">
              <MbField
                label="Court notes"
                htmlFor="fk-notes"
                hint="Visible to anyone with the share link."
              >
                <MbTextArea
                  id="fk-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </MbField>
            </FormBlock>

            <FormBlock label="empty + error">
              <MbField
                label="Why the match was voided"
                htmlFor="fk-brief"
                required
                error="A reason is required before a completed match can be voided."
              >
                <MbTextArea
                  id="fk-brief"
                  rows={3}
                  value={brief}
                  placeholder="Both captains agreed the net height was wrong."
                  onChange={(event) => setBrief(event.target.value)}
                />
              </MbField>
            </FormBlock>

            <FormBlock label="long text" note="wraps, never widens the shell">
              <MbField label="Rain plan" htmlFor="fk-longnotes">
                <MbTextArea
                  id="fk-longnotes"
                  rows={6}
                  value={longNotes}
                  onChange={(event) => setLongNotes(event.target.value)}
                />
              </MbField>
            </FormBlock>

            <FormBlock label="disabled">
              <MbField label="Archived summary" htmlFor="fk-archived">
                <MbTextArea
                  id="fk-archived"
                  rows={2}
                  disabled
                  readOnly
                  value="Sealed when the session ended."
                />
              </MbField>
            </FormBlock>
          </Panel>
        </div>

        {/* -------------------------------------------- MbNumberStepper */}
        <div className="xl:col-span-7">
          <Panel
            title="MbNumberStepper"
            icon="plus"
            meta={<span className="mb-kicker tabular-nums">44 / 56px</span>}
          >
            <FormBlock label='size="sm"' note="clamps on change and on blur">
              <MbField
                label="Points to win"
                htmlFor="fk-points"
                hint="Clear the field and blur — it returns to the last legal value, not 0."
              >
                <MbNumberStepper
                  id="fk-points"
                  label="Points to win"
                  value={points}
                  onChange={setPoints}
                  min={1}
                  max={99}
                />
              </MbField>
            </FormBlock>

            <FormBlock label='size="lg" + suffix' note="console-scale figure">
              <MbField label="Series length" htmlFor="fk-games">
                <MbNumberStepper
                  id="fk-games"
                  label="Series length"
                  size="lg"
                  value={games}
                  onChange={setGames}
                  min={1}
                  max={7}
                  step={2}
                  suffix=" games"
                />
              </MbField>
            </FormBlock>

            <FormBlock label="wrap + prefix" note='rotation R1–R6 — "−" from R1 lands on R6'>
              <MbField label="Rotation" htmlFor="fk-rotation">
                <MbNumberStepper
                  id="fk-rotation"
                  label="Rotation"
                  value={rotation}
                  onChange={setRotation}
                  min={1}
                  max={6}
                  wrap
                  prefix="R"
                />
              </MbField>
            </FormBlock>

            <FormBlock label="at bounds + disabled" note="−/+ disable at the ends">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                <MbField label="Courts (at min)" htmlFor="fk-courts">
                  <MbNumberStepper
                    id="fk-courts"
                    label="Courts"
                    value={courts}
                    onChange={setCourts}
                    min={1}
                    max={4}
                  />
                </MbField>
                <MbField label="Seed cap (at max)" htmlFor="fk-seed">
                  <MbNumberStepper
                    id="fk-seed"
                    label="Seed cap"
                    value={seed}
                    onChange={setSeed}
                    min={2}
                    max={48}
                  />
                </MbField>
                <MbField label="Locked" htmlFor="fk-locked">
                  <MbNumberStepper
                    id="fk-locked"
                    label="Locked value"
                    value={21}
                    onChange={() => {}}
                    min={1}
                    max={99}
                    disabled
                  />
                </MbField>
              </div>
            </FormBlock>
          </Panel>
        </div>

        {/* ---------------------------------------------------- MbSelect */}
        <div className="xl:col-span-5">
          <Panel title="MbSelect" icon="chevron-down">
            <FormBlock label="default">
              <MbField
                label="Format"
                htmlFor="fk-format"
                hint="Decides which settings below apply."
              >
                <MbSelect
                  id="fk-format"
                  options={FORMAT_OPTIONS}
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                />
              </MbField>
            </FormBlock>

            <FormBlock label="placeholder + long + disabled option">
              <MbField
                label="Venue"
                htmlFor="fk-venue"
                error={venue === "" ? "Pick a venue before publishing." : undefined}
              >
                <MbSelect
                  id="fk-venue"
                  options={VENUE_OPTIONS}
                  placeholder="Choose a venue"
                  value={venue}
                  onChange={(event) => setVenue(event.target.value)}
                />
              </MbField>
            </FormBlock>

            <FormBlock label="pair" note="two fields in one row still hold 48px">
              <div className="grid grid-cols-2 gap-3">
                <MbField label="Court" htmlFor="fk-court">
                  <MbSelect
                    id="fk-court"
                    value={courtSel}
                    onChange={(event) => setCourtSel(event.target.value)}
                    options={[
                      { value: "c1", label: "Court 1" },
                      { value: "c2", label: "Court 2" },
                    ]}
                  />
                </MbField>
                <MbField label="Round" htmlFor="fk-round">
                  <MbSelect
                    id="fk-round"
                    value={roundSel}
                    onChange={(event) => setRoundSel(event.target.value)}
                    options={[
                      { value: "r1", label: "Round 1" },
                      { value: "r2", label: "Round 2" },
                      { value: "r3", label: "Round 3" },
                    ]}
                  />
                </MbField>
              </div>
            </FormBlock>

            <FormBlock label="disabled">
              <MbField label="Scoring mode" htmlFor="fk-mode" hint="Fixed by the format.">
                <MbSelect
                  id="fk-mode"
                  disabled
                  value="rally"
                  onChange={() => {}}
                  options={[{ value: "rally", label: "Rally scoring" }]}
                />
              </MbField>
            </FormBlock>
          </Panel>
        </div>

        {/* ----------------------------------------------- MbToggleChip */}
        <div className="xl:col-span-7">
          <Panel
            title="MbToggleChip"
            icon="grid"
            meta={<span className="mb-kicker">shape + colour</span>}
          >
            <FormBlock
              label="pressed / unpressed"
              note="the ballot box reads on/off in greyscale"
            >
              <div className="flex flex-wrap gap-2">
                <MbToggleChip icon="swap" pressed={overlaps} onPressedChange={setOverlaps}>
                  Overlaps
                </MbToggleChip>
                <MbToggleChip icon="arrow-move" pressed={arrows} onPressedChange={setArrows}>
                  Arrows
                </MbToggleChip>
                <MbToggleChip icon="court" pressed={zones} onPressedChange={setZones}>
                  Zone numerals
                </MbToggleChip>
                <MbToggleChip pressed={wide} onPressedChange={setWide}>
                  No icon
                </MbToggleChip>
              </div>
            </FormBlock>

            <FormBlock label="disabled" note="both states stay legible at 40% opacity">
              <div className="flex flex-wrap gap-2">
                <MbToggleChip icon="lock" pressed disabled onPressedChange={() => {}}>
                  Locked on
                </MbToggleChip>
                <MbToggleChip icon="lock" pressed={false} disabled onPressedChange={() => {}}>
                  Locked off
                </MbToggleChip>
              </div>
            </FormBlock>

            <FormBlock label="filter row" note="wraps instead of scrolling sideways">
              <div className="flex flex-wrap gap-2">
                {[
                  ["upsets", "Upsets"],
                  ["finals", "Finals only"],
                  ["ties", "Ties"],
                  ["forfeits", "Forfeits"],
                  ["guest", "Guest matches"],
                  ["voided", "Voided"],
                ].map(([value, label]) => (
                  <MbToggleChip
                    key={value}
                    pressed={filters.includes(value)}
                    onPressedChange={(next) =>
                      setFilters((current) =>
                        next
                          ? [...current, value]
                          : current.filter((entry) => entry !== value),
                      )
                    }
                  >
                    {label}
                  </MbToggleChip>
                ))}
              </div>
            </FormBlock>

            <FormBlock label="long label" note="truncates, never wraps the row">
              <div className="max-w-[18rem]">
                <MbToggleChip icon="filter" pressed onPressedChange={() => {}}>
                  Show only matches that changed the standings
                </MbToggleChip>
              </div>
            </FormBlock>
          </Panel>
        </div>

        {/* ---------------------------------------------------- MbToggle */}
        <div className="xl:col-span-5">
          <Panel
            title="MbToggle"
            icon="check"
            meta={<span className="mb-kicker">full-row target</span>}
          >
            <FormBlock label="on / off + hint">
              <div className="flex flex-col gap-2">
                <MbToggle
                  checked={ties}
                  onChange={setTies}
                  label="Allow ties"
                  hint="Draws score 1 point each instead of replaying."
                />
                <MbToggle
                  checked={libero}
                  onChange={setLibero}
                  label="Track the libero separately in every rotation frame"
                />
                <MbToggle
                  checked={ranked}
                  onChange={setRanked}
                  label="Ranked"
                  hint="Results feed the season ladder."
                />
              </div>
            </FormBlock>

            <FormBlock label="disabled" note="state still readable">
              <div className="flex flex-col gap-2">
                <MbToggle
                  checked
                  disabled
                  onChange={() => {}}
                  label="Publish results"
                  hint="Forced on while the session is shared."
                />
                <MbToggle
                  checked={false}
                  disabled
                  onChange={() => {}}
                  label="Guest scoring"
                  hint="Unavailable on this format."
                />
              </div>
            </FormBlock>
          </Panel>
        </div>

        {/* --------------------------------------------- MbSwatchPicker */}
        <div className="xl:col-span-7">
          <Panel
            title="MbSwatchPicker"
            icon="star"
            meta={
              <span className="mb-kicker tabular-nums">44px squares</span>
            }
          >
            <FormBlock
              label="house palette + custom"
              note="roving tabindex — arrows move, Home/End jump"
            >
              <MbSwatchPicker
                label="Team colour"
                value={teamColour}
                onChange={setTeamColour}
                allowCustom
              />
            </FormBlock>

            <FormBlock label="explicit palette" note="any token list, no custom entry">
              <MbSwatchPicker
                label="Accent colour"
                value={customColour}
                onChange={setCustomColour}
                palette={[
                  "var(--mb-coral)",
                  "var(--mb-navy)",
                  "var(--mb-gold)",
                  "var(--mb-plum)",
                ]}
              />
            </FormBlock>

            <FormBlock label="custom hex" note="off-palette value, readout switches to hex">
              <MbSwatchPicker
                label="Kit colour"
                value={hexColour}
                onChange={setHexColour}
                allowCustom
              />
            </FormBlock>

            <FormBlock label="in situ" note="the colour only ever appears as a contained bar">
              <div className="flex flex-wrap items-center gap-4">
                <TeamMark
                  team={{ name: "Riptide", crest: crestPath("riptide") }}
                  size="lg"
                  accent={teamColour}
                />
                <TeamMark
                  team={{ name: "Flare", crest: crestPath("flare") }}
                  size="lg"
                  accent={customColour}
                />
              </div>
            </FormBlock>
          </Panel>
        </div>

        {/* -------------------------------------------------- MbTagInput */}
        <div className="xl:col-span-5">
          <Panel title="MbTagInput" icon="queue">
            <FormBlock label="populated + max" note="Enter or comma commits">
              <MbField label="Tags" htmlFor="fk-tags">
                <MbTagInput
                  id="fk-tags"
                  value={tags}
                  onChange={setTags}
                  max={6}
                  placeholder="Add a tag"
                />
              </MbField>
            </FormBlock>

            <FormBlock label="empty">
              <MbField label="Player names" htmlFor="fk-empty-tags">
                <MbTagInput
                  id="fk-empty-tags"
                  value={emptyTags}
                  onChange={setEmptyTags}
                  placeholder="Type a name and press Enter"
                />
              </MbField>
            </FormBlock>

            <FormBlock label="at max + long tag" note="the field disappears at the limit">
              <MbField label="Labels" htmlFor="fk-full-tags">
                <MbTagInput
                  id="fk-full-tags"
                  value={fullTags}
                  onChange={setFullTags}
                  max={3}
                />
              </MbField>
            </FormBlock>

            <FormBlock label="disabled">
              <MbField label="Locked labels" htmlFor="fk-locked-tags">
                <MbTagInput
                  id="fk-locked-tags"
                  value={["archived"]}
                  onChange={() => {}}
                  disabled
                />
              </MbField>
            </FormBlock>
          </Panel>
        </div>
      </div>
    </section>
  );
};

/* ===================================================================== */
/* W1 / P1 — Overlays & feedback                                         */
/* ===================================================================== */

const OverlayBlock = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="border-t border-mb-rule px-4 py-4 first:border-t-0">
    <p className="mb-kicker mb-3">{label}</p>
    {children}
  </div>
);

const NOTICE_TONES: MbNoticeTone[] = ["info", "success", "warn", "danger"];

const NOTICE_COPY: Record<MbNoticeTone, { title: string; line: string }> = {
  info: { title: "Draft competition", line: "Nothing is published until you start it." },
  success: { title: "Link copied", line: "The share link is on your clipboard." },
  warn: { title: "Odd team count", line: "7 teams means one bye every round." },
  danger: { title: "Check the entries", line: "Two teams are both named Riptide." },
};

const OVERLAY_LEDGER = Array.from({ length: 16 }, (_, i) => ({
  round: i + 1,
  court: (i % 3) + 1,
  home: 21 + ((i * 3) % 5),
  away: 11 + ((i * 7) % 10),
}));

const OVERLAY_ROSTER = [
  "Harbor Surge",
  "Riptide",
  "Northside Apex",
  "Summit Peak",
  "Ironclad",
  "Lantern Bay",
  "Foundry",
  "Meridian",
];

const OVERLAY_LONG_NAME = "Northside Apex Volleyball Club Reserves and Development Squad";

const OVERLAY_LONG_LINE =
  "The organiser ended this session while your device was offline, so the scores below are the last ones this browser received and may be behind the final result.";

/** Standings row used twice at identical geometry — loaded, then loading. */
const OverlayLedgerRow = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`flex items-center gap-3 border-t border-mb-rule px-4 py-2.5 first:border-t-0 ${className}`}
  >
    {children}
  </div>
);

const OverlayTrigger = ({
  id,
  label,
  onOpen,
}: {
  id: string;
  label: string;
  onOpen: (id: string) => void;
}) => (
  <MbButton variant="outline-navy" data-shot={id} onClick={() => onOpen(id)}>
    {label}
  </MbButton>
);

const OverlaysAndFeedbackSection = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retries, setRetries] = useState(0);
  const [portals, setPortals] = useState<number | null>(null);
  const focusTargetRef = useRef<HTMLButtonElement | null>(null);

  const dialog = (id: string) => ({
    open: openId === id,
    onOpenChange: (next: boolean) => setOpenId(next ? id : null),
  });

  const emptyCases: {
    tone: MbEmptyStateTone;
    title: string;
    body: React.ReactNode;
    actions?: MbEmptyStateAction[];
  }[] = [
    {
      tone: "empty",
      title: "No competitions yet",
      body: "No competitions exist yet — create one and it will appear here with its schedule and standings.",
      actions: [{ label: "New competition", icon: "plus", href: "/competitions/new" }],
    },
    {
      tone: "notfound",
      title: "That competition is gone",
      body: "The link may be out of date, or the organiser deleted it.",
      actions: [
        { label: "All competitions", icon: "chevron-left", href: "/competitions" },
        { label: "Go home", href: "/", tone: "outline" },
      ],
    },
    {
      tone: "error",
      title: "Standings failed to load",
      body: (
        <>
          The scores are safe — this is a display problem. Retry attempts:{" "}
          <span className="tabular-nums font-semibold text-mb-navy">{retries}</span>
        </>
      ),
      actions: [
        { label: "Retry", icon: "refresh", onClick: () => setRetries((n) => n + 1) },
      ],
    },
    {
      tone: "offline",
      title: "You are offline",
      body: OVERLAY_LONG_LINE,
    },
    {
      tone: "denied",
      title: "This session is private",
      body: "Ask the organiser for the share link, or sign in with the account that created it.",
      actions: [{ label: "Sign in", icon: "login", href: "/login", tone: "navy" }],
    },
    {
      tone: "unconfigured",
      title: "Sharing is not set up on this deployment",
      body: "An administrator has to connect a database before live links can be published.",
    },
  ];

  return (
    <section id="w1-p1-overlays-feedback" className="mt-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-mb-navy pb-2">
        <h2 className="matchbook-display text-2xl font-bold leading-none tracking-[0.05em]">
          Overlays &amp; <span className="text-mb-coral">Feedback</span>
        </h2>
        <p className="mb-kicker">
          W1 / P1 — MbDialog · MbConfirm · MbSheet · MbNotice · MbEmptyState · MbSkeleton
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* ---------------------------------------------------- MbDialog */}
        <div className="xl:col-span-7">
          <Panel
            title="MbDialog"
            icon="grid"
            meta={<span className="mb-kicker">3 tones · 3 sizes</span>}
          >
            <OverlayBlock label="Tone x size x mobile presentation">
              <div className="flex flex-wrap items-center gap-3">
                <OverlayTrigger id="dlg-paper" label="Paper / md / sheet" onOpen={setOpenId} />
                <OverlayTrigger id="dlg-navy" label="Navy / sm / sheet" onOpen={setOpenId} />
                <OverlayTrigger id="dlg-danger" label="Danger / lg / centre" onOpen={setOpenId} />
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Below <code>sm</code> the first two anchor to the bottom edge; the third stays
                centred. Widths are 26 / 32 / 42rem from <code>sm</code> up.
              </p>
            </OverlayBlock>

            <OverlayBlock label="Behaviour">
              <div className="flex flex-wrap items-center gap-3">
                <OverlayTrigger id="dlg-locked" label="Not dismissible" onOpen={setOpenId} />
                <OverlayTrigger id="dlg-focus" label="Initial focus" onOpen={setOpenId} />
                <OverlayTrigger id="dlg-scroll" label="Overflowing body" onOpen={setOpenId} />
                <OverlayTrigger id="dlg-bare" label="Title only" onOpen={setOpenId} />
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Not-dismissible withholds the close control, Escape and outside-click at once.
                The overflowing body scrolls inside itself with{" "}
                <code>overscroll-contain</code>; the footer never leaves the frame.
              </p>
            </OverlayBlock>

            <OverlayBlock label="Null content renders no portal">
              <div className="flex flex-wrap items-center gap-3">
                <MbButton
                  variant="outline"
                  data-shot="dlg-probe"
                  icon="search"
                  onClick={() =>
                    setPortals(
                      document.querySelectorAll('.mb-dialog-overlay, [role="dialog"]').length,
                    )
                  }
                >
                  Count overlay nodes
                </MbButton>
                <span className="mb-code-chip tabular-nums">{portals ?? "--"}</span>
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                An <code>open</code> dialog whose children resolve to <code>null</code> is
                mounted directly below this line. The count reads 0 with every dialog closed —
                the portal is never created (charter W1 acceptance 6).
              </p>
              <MbDialog open onOpenChange={() => undefined} title="Share session">
                {null}
              </MbDialog>
            </OverlayBlock>
          </Panel>
        </div>

        {/* ----------------------------------------------------- MbSheet */}
        <div className="xl:col-span-5">
          <Panel title="MbSheet" icon="more" meta={<span className="mb-kicker">bottom</span>}>
            <OverlayBlock label="Presentation">
              <div className="flex flex-wrap items-center gap-3">
                <OverlayTrigger id="sheet-plain" label="Plain sheet" onOpen={setOpenId} />
                <OverlayTrigger id="sheet-snap" label="Snap points" onOpen={setOpenId} />
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Discrete heights only — 42% then 90% of the viewport, cycled by a real 44px
                control. No drag gesture is implied, because none exists yet.
              </p>
            </OverlayBlock>

            <OverlayBlock label="Composition">
              <p className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
                A sheet supplies the frame, the title and the close control. Wrap content in{" "}
                <code>MbDialogBody</code> for the scroll region and{" "}
                <code>MbDialogFooter</code> for a pinned action row — the same two children a
                dialog takes.
              </p>
            </OverlayBlock>
          </Panel>
        </div>

        {/* --------------------------------------------------- MbConfirm */}
        <div className="xl:col-span-5">
          <Panel
            title="MbConfirm"
            icon="warning"
            meta={<span className="mb-kicker">the only confirm</span>}
          >
            <OverlayBlock label="Destructive and neutral">
              <div className="flex flex-wrap items-center gap-3">
                <OverlayTrigger id="confirm-delete" label="Delete team" onOpen={setOpenId} />
                <OverlayTrigger id="confirm-archive" label="Archive session" onOpen={setOpenId} />
                <OverlayTrigger id="confirm-long" label="Long subject" onOpen={setOpenId} />
                <OverlayTrigger id="confirm-busy" label="In-flight" onOpen={setOpenId} />
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Danger reads on three channels — the red 4px dialog rule, the warning glyph and
                the verb spelled out on the button. Never colour alone.
              </p>
            </OverlayBlock>

            <OverlayBlock label="DeleteConfirmDialog — rewired adapter">
              <div className="flex flex-wrap items-center gap-3">
                <MbButton
                  variant="outline"
                  icon="trash"
                  data-shot="delete-adapter"
                  onClick={() => setDeleteOpen(true)}
                >
                  Open adapter
                </MbButton>
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                <code>src/components/shared/DeleteConfirmDialog.tsx</code> now renders{" "}
                <code>MbConfirm</code> internally. Its public props are unchanged, so all five
                existing call sites were untouched.
              </p>
            </OverlayBlock>
          </Panel>
        </div>

        {/* ---------------------------------------------------- MbNotice */}
        <div className="xl:col-span-7">
          <Panel title="MbNotice" icon="bell" meta={<span className="mb-kicker">4 tones</span>}>
            <OverlayBlock label="Titled">
              <div className="flex flex-col gap-2.5">
                {NOTICE_TONES.map((tone) => (
                  <MbNotice key={tone} tone={tone} title={NOTICE_COPY[tone].title}>
                    {NOTICE_COPY[tone].line}
                  </MbNotice>
                ))}
              </div>
            </OverlayBlock>

            <OverlayBlock label="One line, no title">
              <div className="flex flex-col gap-2.5">
                {NOTICE_TONES.map((tone) => (
                  <MbNotice key={tone} tone={tone}>
                    {NOTICE_COPY[tone].line}
                  </MbNotice>
                ))}
              </div>
            </OverlayBlock>

            <OverlayBlock label="Custom glyph, long copy, inline action">
              <div className="flex flex-col gap-2.5">
                <MbNotice tone="warn" icon="wifi-off" title="Working from cache">
                  {OVERLAY_LONG_LINE}
                </MbNotice>
                <MbNotice tone="info" icon="key" title="Admin link">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="min-w-0">
                      The admin link stays hidden until you reveal it.
                    </span>
                    <MbButton
                      variant="outline-navy"
                      size="sm"
                      iconRight="chevron-right"
                      onClick={() => setOpenId("dlg-bare")}
                    >
                      What this means
                    </MbButton>
                  </span>
                </MbNotice>
              </div>
            </OverlayBlock>
          </Panel>
        </div>

        {/* -------------------------------------------------- MbSkeleton */}
        <div className="xl:col-span-12">
          <Panel
            title="MbSkeleton"
            icon="clock"
            meta={<span className="mb-kicker">static, no shimmer</span>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="md:border-r md:border-mb-rule">
                <OverlayBlock label="Bars, paragraphs, radii">
                  <div className="flex flex-col gap-4">
                    <MbSkeleton />
                    <div className="flex flex-wrap items-center gap-3">
                      <MbSkeleton w={180} h={12} />
                      <MbSkeleton w="12ch" h={10} />
                      <MbSkeleton w={44} h={44} radius={4} />
                      <MbSkeleton w={44} h={44} radius={3} />
                      <MbSkeleton w={44} h={44} radius={2} />
                    </div>
                    <MbSkeleton lines={2} />
                    <MbSkeleton lines={4} w="80%" />
                  </div>
                  <p className="mt-4 text-[0.72rem] text-mb-ink-muted">
                    No shimmer anywhere — a shimmer is a gradient, and gradients are banned
                    (GAP-8). The block is inert and <code>aria-hidden</code>.
                  </p>
                </OverlayBlock>
              </div>

              <div className="border-t border-mb-rule md:border-t-0">
                <OverlayBlock label="Final geometry — loaded vs loading">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="mb-tile rounded-[3px]">
                      <p className="mb-kicker border-b border-mb-rule px-4 py-2">Loaded</p>
                      {OVERLAY_ROSTER.slice(0, 4).map((name, i) => (
                        <OverlayLedgerRow key={name}>
                          <span className="matchbook-display w-5 shrink-0 text-[0.78rem] font-bold tabular-nums">
                            {i + 1}
                          </span>
                          <span className="matchbook-display min-w-0 flex-1 truncate text-[0.78rem] font-semibold">
                            {name}
                          </span>
                          <span className="matchbook-display shrink-0 text-[0.78rem] font-bold tabular-nums">
                            {6 - i}-{i}
                          </span>
                        </OverlayLedgerRow>
                      ))}
                    </div>
                    <div className="mb-tile rounded-[3px]">
                      <p className="mb-kicker border-b border-mb-rule px-4 py-2">Loading</p>
                      {OVERLAY_ROSTER.slice(0, 4).map((name) => (
                        /* text-[0.78rem] so `1.5em` resolves to the exact line
                           box the real row sets — same row height, to the pixel. */
                        <OverlayLedgerRow key={name} className="text-[0.78rem]">
                          <MbSkeleton w={20} h="1.5em" />
                          <span className="min-w-0 flex-1">
                            <MbSkeleton w="70%" h="1.5em" />
                          </span>
                          <MbSkeleton w={26} h="1.5em" />
                        </OverlayLedgerRow>
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 text-[0.72rem] text-mb-ink-muted">
                    Every row is <span className="tabular-nums font-semibold">39.72px</span> in
                    both tiles, so the swap costs zero layout shift (invariants 26 and 27).
                  </p>
                </OverlayBlock>
              </div>
            </div>
          </Panel>
        </div>

        {/* ------------------------------------------------ MbEmptyState */}
        {emptyCases.map((state) => (
          <div key={state.tone} className="xl:col-span-4">
            <MbEmptyState
              tone={state.tone}
              title={state.title}
              body={state.body}
              actions={state.actions}
            />
          </div>
        ))}
      </div>

      {/* ------------------------------------------- dialog instances -- */}

      <MbDialog
        {...dialog("dlg-paper")}
        title="Share live scores"
        icon="share"
        kicker="Summer League"
        description="Anyone with the link can follow the scores. Only you can edit them."
        size="md"
      >
        <MbDialogBody className="flex flex-col gap-3">
          <p className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
            The link stays live until you end the session. Ending it publishes a summary at a
            separate address.
          </p>
          <span className="mb-code-chip self-start tabular-nums">SUMMER-4821</span>
        </MbDialogBody>
        <MbDialogFooter>
          <MbButton variant="outline-navy" size="lg" onClick={() => setOpenId(null)}>
            Cancel
          </MbButton>
          <MbButton variant="coral" size="lg" icon="copy" onClick={() => setOpenId(null)}>
            Copy link
          </MbButton>
        </MbDialogFooter>
      </MbDialog>

      <MbDialog
        {...dialog("dlg-navy")}
        title="Court assignment"
        icon="court"
        kicker="Round 3"
        tone="navy"
        size="sm"
      >
        <MbDialogBody className="flex flex-col gap-2">
          {OVERLAY_ROSTER.slice(0, 3).map((name, i) => (
            <div
              key={name}
              className="flex items-center justify-between gap-3 border-b border-mb-rule pb-2 last:border-b-0 last:pb-0"
            >
              <span className="matchbook-display min-w-0 truncate text-[0.78rem] font-semibold">
                {name}
              </span>
              <span className="mb-kicker tabular-nums">Court {i + 1}</span>
            </div>
          ))}
        </MbDialogBody>
        <MbDialogFooter>
          <MbButton variant="navy" size="lg" onClick={() => setOpenId(null)}>
            Assign
          </MbButton>
        </MbDialogFooter>
      </MbDialog>

      <MbDialog
        {...dialog("dlg-danger")}
        title="Reset the Saturday evening double-elimination consolation bracket"
        icon="warning"
        kicker="Destructive"
        description="Every completed match in the losers bracket is cleared and re-seeded from the current standings."
        tone="danger"
        size="lg"
        mobile="center"
      >
        <MbDialogBody>
          <p className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
            Scores already recorded in the winners bracket are kept. This cannot be undone.
          </p>
        </MbDialogBody>
        <MbDialogFooter>
          <MbButton variant="outline-navy" size="lg" onClick={() => setOpenId(null)}>
            Keep bracket
          </MbButton>
          <MbButton variant="coral" size="lg" onClick={() => setOpenId(null)}>
            Reset bracket
          </MbButton>
        </MbDialogFooter>
      </MbDialog>

      <MbDialog
        {...dialog("dlg-locked")}
        title="Finishing the match"
        icon="clock"
        size="sm"
        dismissible={false}
      >
        <MbDialogBody>
          <p className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
            No close control, no Escape, no outside-click. The footer is the only way out, which
            is the point — a half-written result must not be abandoned by a stray tap.
          </p>
        </MbDialogBody>
        <MbDialogFooter>
          <MbButton variant="navy" size="lg" onClick={() => setOpenId(null)}>
            Understood
          </MbButton>
        </MbDialogFooter>
      </MbDialog>

      <MbDialog
        {...dialog("dlg-focus")}
        title="Where focus lands"
        icon="key"
        size="sm"
        initialFocus={focusTargetRef}
      >
        <MbDialogBody>
          <p className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
            Focus opens on the second footer control rather than the close button. Radix still
            traps Tab inside the frame and restores focus to the trigger on close.
          </p>
        </MbDialogBody>
        <MbDialogFooter>
          <MbButton variant="outline-navy" size="lg" onClick={() => setOpenId(null)}>
            First
          </MbButton>
          {/* Raw button: MbButton does not declare a `ref` prop, so it cannot be
              the target of `initialFocus`. */}
          <button
            ref={focusTargetRef}
            type="button"
            className="mb-btn mb-btn-navy mb-btn-lg"
            onClick={() => setOpenId(null)}
          >
            Second — focused
          </button>
        </MbDialogFooter>
      </MbDialog>

      <MbDialog
        {...dialog("dlg-scroll")}
        title="Results ledger"
        icon="history"
        kicker="16 matches"
        size="md"
      >
        <MbDialogBody flush>
          {OVERLAY_LEDGER.map((row) => (
            <OverlayLedgerRow key={row.round}>
              <span className="mb-kicker w-14 shrink-0 tabular-nums">R{row.round}</span>
              <span className="matchbook-display min-w-0 flex-1 truncate text-[0.78rem] font-semibold">
                Court {row.court}
              </span>
              <span className="matchbook-display shrink-0 text-[0.9rem] font-bold tabular-nums">
                {row.home}-{row.away}
              </span>
            </OverlayLedgerRow>
          ))}
        </MbDialogBody>
        <MbDialogFooter>
          <MbButton variant="outline-navy" size="lg" icon="export" onClick={() => setOpenId(null)}>
            Export
          </MbButton>
          <MbButton variant="navy" size="lg" onClick={() => setOpenId(null)}>
            Done
          </MbButton>
        </MbDialogFooter>
      </MbDialog>

      <MbDialog {...dialog("dlg-bare")} title="Title only" size="sm">
        <MbDialogBody>
          <p className="text-[0.85rem] leading-[1.5] text-mb-ink-muted">
            No icon, no kicker, no description, no footer. The frame still traps focus, closes on
            Escape and carries a 44px close target.
          </p>
        </MbDialogBody>
      </MbDialog>

      {/* -------------------------------------------- sheet instances -- */}

      <MbSheet {...dialog("sheet-plain")} title="More">
        <MbDialogBody flush>
          {OVERLAY_ROSTER.slice(0, 5).map((name) => (
            <button
              key={name}
              type="button"
              className="mb-row-hover flex w-full min-h-[44px] items-center gap-3 border-t border-mb-rule px-4 py-2.5 text-left first:border-t-0"
              onClick={() => setOpenId(null)}
            >
              <MbIcon id="teams" size={16} className="shrink-0" />
              <span className="matchbook-display min-w-0 flex-1 truncate text-[0.78rem] font-semibold">
                {name}
              </span>
              <MbIcon id="chevron-right" size={11} className="shrink-0" />
            </button>
          ))}
        </MbDialogBody>
      </MbSheet>

      <MbSheet {...dialog("sheet-snap")} title="Results ledger" snapPoints={[0.42, 0.9]}>
        <MbDialogBody flush>
          {OVERLAY_LEDGER.map((row) => (
            <OverlayLedgerRow key={row.round}>
              <span className="mb-kicker w-14 shrink-0 tabular-nums">R{row.round}</span>
              <span className="matchbook-display min-w-0 flex-1 truncate text-[0.78rem] font-semibold">
                Court {row.court}
              </span>
              <span className="matchbook-display shrink-0 text-[0.9rem] font-bold tabular-nums">
                {row.home}-{row.away}
              </span>
            </OverlayLedgerRow>
          ))}
        </MbDialogBody>
        <MbDialogFooter>
          <MbButton variant="navy" size="lg" onClick={() => setOpenId(null)}>
            Done
          </MbButton>
        </MbDialogFooter>
      </MbSheet>

      {/* ------------------------------------------ confirm instances -- */}

      <MbConfirm
        {...dialog("confirm-delete")}
        title="Delete team?"
        verb="Delete"
        subject="Harbor Surge"
        onConfirm={() => setOpenId(null)}
      />

      <MbConfirm
        {...dialog("confirm-archive")}
        title="Archive session?"
        verb="Archive"
        subject="Thursday Social"
        destructive={false}
        confirmLabel="Archive session"
        body="The summary stays available at its share link. You can reopen the session later."
        onConfirm={() => setOpenId(null)}
      />

      <MbConfirm
        {...dialog("confirm-long")}
        title="Delete team?"
        verb="Delete"
        subject={OVERLAY_LONG_NAME}
        body="This permanently removes the team, its crest, its colour and all 42 of its recorded results."
        onConfirm={() => setOpenId(null)}
      />

      <MbConfirm
        {...dialog("confirm-busy")}
        title="End session?"
        verb="End session"
        subject="Summer League"
        loading={busy}
        body={
          <span className="flex flex-col items-start gap-3">
            <span>
              While the action is in flight the close control, Escape and outside-click are all
              withheld, and the confirm button carries a static busy glyph.
            </span>
            <MbButton
              variant="outline-navy"
              size="sm"
              aria-pressed={busy}
              onClick={() => setBusy((b) => !b)}
            >
              {busy ? "Stop simulating" : "Simulate in-flight"}
            </MbButton>
          </span>
        }
        onConfirm={() => setOpenId(null)}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Competition?"
        description='This will permanently delete "Summer League" and all of its matches.'
        onConfirm={() => setDeleteOpen(false)}
      />
    </section>
  );
};

/* ===================================================================== */
/* W1 / P1 — Score & status display                                      */
/* ===================================================================== */

const SCORE_HOME: MbTeam = { name: "Harbor Surge", crest: crestPath("surge") };
const SCORE_AWAY: MbTeam = { name: "Riptide", crest: crestPath("riptide") };
/** Exactly 40 characters — the overflow case the charter names. */
const SCORE_LONG_A: MbTeam = {
  name: "Northwest Kalamazoo Thunderhawks Academy",
  crest: crestPath("storm"),
};
const SCORE_LONG_B: MbTeam = {
  name: "Southbank Metropolitan Volleyball Union",
  crest: crestPath("nova"),
};

const SCORE_SIZES: MbScoreNumeralSize[] = ["compact", "console", "court"];
const STAT_TONES: MbStatTone[] = ["navy", "coral", "teal", "green", "gold", "red"];
const LIVE_STATUSES: MbLiveStatusValue[] = [
  "live",
  "reconnecting",
  "offline",
  "ended",
  "idle",
];

const ScoreKitBlock = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="border-t border-mb-rule px-4 py-4 first:border-t-0">
    <p className="mb-kicker mb-3">{label}</p>
    {children}
  </div>
);

const ScoreAndStatusSection = () => {
  const [home, setHome] = useState(24);
  const [away, setAway] = useState(18);
  const [homeFlash, setHomeFlash] = useState<"up" | "down" | null>(null);
  const [awayFlash, setAwayFlash] = useState<"up" | "down" | null>(null);
  const [meter, setMeter] = useState(62);
  const [conn, setConn] = useState<MbLiveStatusValue>("offline");
  const [purging, setPurging] = useState(true);
  const [picked, setPicked] = useState("nothing yet");

  const bumpHome = (delta: number) => {
    setHome((v) => Math.max(0, v + delta));
    setHomeFlash(delta > 0 ? "up" : "down");
  };
  const bumpAway = (delta: number) => {
    setAway((v) => Math.max(0, v + delta));
    setAwayFlash(delta > 0 ? "up" : "down");
  };

  return (
    <section id="w1-p1-score-and-status" className="mt-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-mb-navy pb-2">
        <h2 className="matchbook-display text-2xl font-bold leading-none tracking-[0.05em]">
          Score &amp; <span className="text-mb-coral">Status</span>
        </h2>
        <p className="mb-kicker">
          W1 / P1 — MbScoreNumeral · MbScoreboardHero · MbStat · MbMeter · MbFinalStamp ·
          MbLiveStatus · MbDangerZone
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* ------------------------------------------- MbScoreboardHero */}
        <div className="xl:col-span-7">
          <Panel
            title="MbScoreboardHero"
            icon="volleyball"
            meta={<span className="mb-kicker">grid 1fr auto 1fr</span>}
          >
            <ScoreKitBlock label='size="hero" — live, wired to the numeral controls'>
              <MbScoreboardHero
                home={SCORE_HOME}
                away={SCORE_AWAY}
                homeScore={home}
                awayScore={away}
                homeAccent="var(--mb-teal)"
                awayAccent="var(--mb-plum)"
                series={{ game: 2, of: 3, homeWins: 1, awayWins: 1 }}
                status="live"
              />
            </ScoreKitBlock>

            <ScoreKitBlock label='size="hero" — final, and a clamped series (game 9 of 3)'>
              <div className="flex flex-col gap-4">
                <MbScoreboardHero
                  home={SCORE_HOME}
                  away={SCORE_AWAY}
                  homeScore={25}
                  awayScore={19}
                  homeAccent="var(--mb-teal)"
                  status="final"
                />
                <MbScoreboardHero
                  home={SCORE_AWAY}
                  away={SCORE_HOME}
                  homeScore={21}
                  awayScore={25}
                  series={{ game: 9, of: 3, homeWins: 1, awayWins: 2 }}
                  status="final"
                />
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label='size="hero" — pending reads "vs", never 0–0'>
              <MbScoreboardHero
                home={SCORE_HOME}
                away={SCORE_AWAY}
                homeScore={0}
                awayScore={0}
                status="pending"
              />
            </ScoreKitBlock>

          </Panel>
        </div>

        {/* ------------------------ MbScoreboardHero — compact & overflow */}
        <div className="xl:col-span-5">
          <Panel
            title="MbScoreboardHero"
            icon="history"
            meta={<span className="mb-kicker">compact</span>}
          >
            <ScoreKitBlock label="Overflow — 40-character and 39-character names">
              <div className="flex flex-col gap-4">
                <MbScoreboardHero
                  home={SCORE_LONG_A}
                  away={SCORE_LONG_B}
                  homeScore={103}
                  awayScore={98}
                  homeAccent="var(--mb-gold)"
                  awayAccent="var(--mb-coral)"
                  series={{ game: 3, of: 5, homeWins: 2, awayWins: 1 }}
                  status="live"
                />
                <MbScoreboardHero
                  home={SCORE_LONG_A}
                  away={SCORE_LONG_B}
                  homeScore={7}
                  awayScore={9}
                  size="compact"
                  status="final"
                />
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Both names truncate inside their own 1fr column; the numerals stay
                optically centred and the score never moves.
              </p>
            </ScoreKitBlock>

            <ScoreKitBlock label='size="compact" — static, link and button'>
              <div className="flex flex-col gap-3">
                <MbScoreboardHero
                  home={SCORE_HOME}
                  away={SCORE_AWAY}
                  homeScore={25}
                  awayScore={22}
                  homeAccent="var(--mb-teal)"
                  awayAccent="var(--mb-plum)"
                  size="compact"
                  status="final"
                />
                <MbScoreboardHero
                  home={SCORE_HOME}
                  away={SCORE_AWAY}
                  homeScore={home}
                  awayScore={away}
                  size="compact"
                  status="live"
                  series={{ game: 2, of: 3, homeWins: 1, awayWins: 1 }}
                  onSelect={() => setPicked("compact live card")}
                />
                <MbScoreboardHero
                  home={SCORE_AWAY}
                  away={SCORE_HOME}
                  homeScore={0}
                  awayScore={0}
                  size="compact"
                  status="pending"
                  href="/dev/kit#w1-p1-score-and-status"
                />
                <p className="text-[0.72rem] text-mb-ink-muted">
                  Last activated: <span className="font-semibold">{picked}</span>
                </p>
              </div>
            </ScoreKitBlock>
          </Panel>
        </div>

        {/* --------------------------------------------- MbScoreNumeral */}
        <div className="xl:col-span-7">
          <Panel
            title="MbScoreNumeral"
            icon="quick"
            meta={<span className="mb-kicker">3 steps</span>}
          >
            <ScoreKitBlock label="Live — cross-fades in place, never translates">
              <div className="flex items-stretch justify-center gap-3">
                <MbScoreNumeral value={home} size="console" flash={homeFlash} />
                <span className="mb-rule-vertical" />
                <MbScoreNumeral value={away} size="console" flash={awayFlash} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center justify-center gap-2">
                  <MbIconButton
                    icon="minus"
                    label="Remove a point from Harbor Surge"
                    tone="outline-navy"
                    onClick={() => bumpHome(-1)}
                  />
                  <MbIconButton
                    icon="plus"
                    label="Add a point to Harbor Surge"
                    tone="navy"
                    onClick={() => bumpHome(1)}
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <MbIconButton
                    icon="minus"
                    label="Remove a point from Riptide"
                    tone="outline-navy"
                    onClick={() => bumpAway(-1)}
                  />
                  <MbIconButton
                    icon="plus"
                    label="Add a point to Riptide"
                    tone="navy"
                    onClick={() => bumpAway(1)}
                  />
                </div>
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                A coral edge marks the direction — top for up, bottom for down — so
                the change survives greyscale.
              </p>
            </ScoreKitBlock>

            {SCORE_SIZES.map((size) => (
              <ScoreKitBlock key={size} label={`size="${size}" — 7 / 21 / 108`}>
                <div className="flex flex-wrap items-end gap-4">
                  {[7, 21, 108].map((n) => (
                    <span key={n} className="border-l border-mb-rule pl-2">
                      <MbScoreNumeral value={n} size={size} />
                    </span>
                  ))}
                </div>
              </ScoreKitBlock>
            ))}

            <ScoreKitBlock label='tone="paper" — on navy'>
              <div className="flex items-center justify-center gap-3 rounded-[4px] bg-mb-navy px-4 py-4">
                <MbScoreNumeral value={home} size="compact" tone="paper" />
                <span className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em] text-mb-paper-bright">
                  vs
                </span>
                <MbScoreNumeral value={away} size="compact" tone="paper" />
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label="Announced variant — ariaLabel opts into the a11y tree">
              <div className="flex items-end gap-4">
                <MbScoreNumeral
                  value={25}
                  size="compact"
                  tone="ink"
                  ariaLabel="Harbor Surge 25"
                />
                <MbScoreNumeral
                  value={19}
                  size="compact"
                  tone="ink"
                  ariaLabel="Riptide 19"
                />
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Without ariaLabel the numeral is aria-hidden: a live console
                announces through its own polite region instead.
              </p>
            </ScoreKitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------------ MbStat */}
        <div className="xl:col-span-5">
          <Panel title="MbStat" icon="chart" meta={<span className="mb-kicker">6 tones</span>}>
            <ScoreKitBlock label='size="md" — icon disc carries the tone'>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {STAT_TONES.map((tone) => (
                  <MbStat
                    key={tone}
                    icon="trophy"
                    tone={tone}
                    label={`${tone} tone`}
                    value={48}
                    sub="+6"
                  />
                ))}
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label='size="sm" — and the iconless rail fallback'>
              <div className="grid grid-cols-2 gap-4">
                <MbStat icon="streak" size="sm" tone="coral" label="Streak" value="W4" />
                <MbStat size="sm" tone="teal" label="Courts busy" value="3 / 4" />
                <MbStat size="sm" tone="green" label="Completed" value={70} sub="100%" />
                <MbStat size="sm" tone="gold" label="Pending" value={17} />
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label="Overflow and empty measures">
              <div className="flex flex-col gap-4">
                <div className="max-w-[190px]">
                  <MbStat
                    icon="calendar"
                    label="Points scored across every completed fixture"
                    value="1,284"
                    sub="season"
                  />
                </div>
                <MbStat icon="clock" tone="navy" label="Not played yet" value="—" />
              </div>
            </ScoreKitBlock>
          </Panel>
        </div>

        {/* ----------------------------------------------------- MbMeter */}
        <div className="xl:col-span-5">
          <Panel title="MbMeter" icon="bracket" meta={<span className="mb-kicker">4px rule</span>}>
            <ScoreKitBlock label="Interactive — the fill animates, the box does not">
              <MbMeter value={meter} label="Squad readiness" color="var(--mb-green)" />
              <div className="mt-4 flex items-center gap-2">
                <MbIconButton
                  icon="minus"
                  label="Lower readiness by ten"
                  tone="outline-navy"
                  onClick={() => setMeter((v) => Math.max(0, v - 10))}
                />
                <MbIconButton
                  icon="plus"
                  label="Raise readiness by ten"
                  tone="navy"
                  onClick={() => setMeter((v) => Math.min(100, v + 10))}
                />
                <span className="ml-1 text-[0.72rem] tabular-nums text-mb-ink-muted">
                  value={meter}
                </span>
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label="0 / 7 / 50 / 100 — clamped, never rounded away">
              <div className="flex flex-col gap-4">
                <MbMeter value={0} label="Not started" />
                <MbMeter value={7} label="Barely begun" color="var(--mb-red)" />
                <MbMeter value={50} label="Halfway" color="var(--mb-gold)" />
                <MbMeter value={100} label="Complete" color="var(--mb-green)" />
                <MbMeter value={140} label="Out of range (140)" />
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label="Unlabelled — a bare rule inside a dense row">
              <div className="flex flex-col gap-3">
                <MbMeter value={38} />
                <MbMeter value={81} color="var(--mb-teal)" />
              </div>
            </ScoreKitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------ MbLiveStatus */}
        <div className="xl:col-span-7">
          <Panel
            title="MbLiveStatus"
            icon="live"
            meta={<span className="mb-kicker">5 states</span>}
          >
            <ScoreKitBlock label='tone="navy" — on paper'>
              <div className="flex flex-col gap-3">
                {LIVE_STATUSES.map((status) => (
                  <MbLiveStatus key={status} status={status} secondsAgo={42} />
                ))}
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label='tone="paper" — on a navy strip'>
              <div className="flex flex-col gap-3 rounded-[4px] bg-mb-navy px-3 py-3">
                {LIVE_STATUSES.map((status) => (
                  <MbLiveStatus
                    key={status}
                    status={status}
                    tone="paper"
                    secondsAgo={status === "live" ? 3 : 260}
                  />
                ))}
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label="Ages — just now / 42s / 4m / 2h, and no age at all">
              <div className="flex flex-col gap-3">
                <MbLiveStatus status="live" secondsAgo={2} />
                <MbLiveStatus status="live" secondsAgo={42} />
                <MbLiveStatus status="offline" secondsAgo={260} />
                <MbLiveStatus status="offline" secondsAgo={7300} />
                <MbLiveStatus status="idle" />
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label="Recoverable — Retry is the caller's callback">
              <MbLiveStatus
                status={conn}
                secondsAgo={conn === "live" ? 1 : 96}
                onRetry={conn === "live" ? undefined : () => setConn("live")}
              />
              <div className="mt-3">
                <MbButton
                  variant="outline-navy"
                  size="sm"
                  icon="wifi-off"
                  onClick={() => setConn("offline")}
                >
                  Drop the connection
                </MbButton>
              </div>
            </ScoreKitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------ MbFinalStamp */}
        <div className="xl:col-span-5">
          <Panel
            title="MbFinalStamp"
            icon="check"
            meta={<span className="mb-kicker">rotated rule</span>}
          >
            <ScoreKitBlock label="Default −6deg, upright 0deg, and −12deg">
              <div className="flex flex-wrap items-center gap-6 py-2">
                <MbFinalStamp />
                <MbFinalStamp rotate={0} />
                <MbFinalStamp rotate={-12} />
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label="Other verdicts">
              <div className="flex flex-wrap items-center gap-6 py-2">
                <MbFinalStamp label="Full time" />
                <MbFinalStamp label="Forfeit" rotate={4} />
                <MbFinalStamp label="Abandoned" rotate={0} />
              </div>
            </ScoreKitBlock>

            <ScoreKitBlock label="In place — against a scoreline">
              <div className="mb-scoreline mb-tile rounded-[4px] px-3 py-3">
                <TeamMark team={SCORE_HOME} size="sm" accent="var(--mb-teal)" />
                <span className="matchbook-display text-2xl font-bold leading-none tabular-nums">
                  25–19
                </span>
                <span className="flex justify-end">
                  <MbFinalStamp />
                </span>
              </div>
            </ScoreKitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------- MbDangerZone */}
        <div className="xl:col-span-7">
          <Panel
            title="MbDangerZone"
            icon="warning"
            meta={<span className="mb-kicker">always last</span>}
          >
            <ScoreKitBlock label="Resting">
              <MbDangerZone
                title="Delete this competition"
                description="Removes the bracket, every match and every result. Teams are kept."
                action={{ label: "Delete", onClick: () => setPurging(true) }}
              />
            </ScoreKitBlock>

            <ScoreKitBlock label="Busy — the click above sets it, click again to clear">
              <MbDangerZone
                title="Purge every archived session"
                description="This cannot be undone and the share links stop resolving immediately."
                action={{
                  label: purging ? "Purging" : "Purge",
                  loading: purging,
                  onClick: () => setPurging((v) => !v),
                }}
              />
            </ScoreKitBlock>

            <ScoreKitBlock label="Long copy and a long verb — stacks below sm">
              <MbDangerZone
                title="Reset every score in the Northwest Kalamazoo Thunderhawks Academy season"
                description="Every completed match returns to pending, standings are recalculated from nothing, and any summary already shared will disagree with the live table until it is regenerated."
                action={{ label: "Reset the whole season", onClick: () => undefined }}
              />
            </ScoreKitBlock>
          </Panel>
        </div>
      </div>
    </section>
  );
};

/* ===================================================================== */

/* ===================================================================== */
/* W1 / P1 — Action & sharing controls                                   */
/* ===================================================================== */

const SHARE_URL = "https://tourneytracker.app/session/HARBOR-CLASSIC";
const LONG_URL =
  "https://tourneytracker.app/session/HARBOR-CLASSIC-2026?admin=8f2c1d0a4b6e9f3c7a5d2e8b1f4c6a9d&view=standings&round=7";
const ADMIN_TOKEN = "8f2c1d0a-4b6e-9f3c-7a5d-2e8b1f4c6a9d";

const ActionBlock = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="border-t border-mb-rule px-4 py-4 first:border-t-0">
    <p className="mb-kicker mb-3 tabular-nums">{label}</p>
    {children}
  </div>
);

/**
 * Takes the clipboard away for real, so the D-8 fallback is exercised rather
 * than described. Both legs go: `navigator.clipboard` is masked by an own
 * property (deleting it restores the prototype getter) and `execCommand` is
 * made to refuse. Harness-only — nothing in the kit does this.
 */
const useBlockedClipboard = (blocked: boolean) => {
  useEffect(() => {
    if (!blocked) return;
    const exec = document.execCommand;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      get: () => undefined,
    });
    document.execCommand = () => false;
    return () => {
      delete (navigator as unknown as { clipboard?: unknown }).clipboard;
      document.execCommand = exec;
    };
  }, [blocked]);
};

const BAR_ROWS = ["Surge", "Riptide", "Cinder", "Halyard", "Anchor", "Peak"];

const BarRows = ({ count }: { count: number }) => (
  <div className="flex flex-col px-4 pt-3">
    {BAR_ROWS.slice(0, count).map((name, i) => (
      <div
        key={name}
        className="flex items-center justify-between gap-3 border-b border-mb-rule py-2 text-[0.8rem]"
      >
        <span className="min-w-0 truncate tabular-nums">
          Match {i + 1} · {name}
        </span>
        <span className="shrink-0 tabular-nums text-mb-ink-muted">21–{15 + i}</span>
      </div>
    ))}
  </div>
);

/** A scroller, so a sticky bar can be seen doing the one thing it does. */
const BarFrame = ({ children }: { children: React.ReactNode }) => (
  /* Full-bleed to the panel edges: a real bar spans the page, and a frame
     inset by the block padding would make it look narrower than it ships. */
  <div className="relative -mx-4 h-[202px] overflow-y-auto border-y-[1.5px] border-mb-navy bg-mb-paper-bright">
    <BarRows count={6} />
    {children}
  </div>
);

const ActionAndSharingSection = () => {
  const [blocked, setBlocked] = useState(false);
  const [outcome, setOutcome] = useState<MbShareOutcome | null>(null);
  const [picked, setPicked] = useState("nothing yet");
  const [committing, setCommitting] = useState(false);

  useBlockedClipboard(blocked);

  const log = (label: string) => () => setPicked(label);

  const matchMenu: MbMenuItem[] = [
    { label: "Edit result", icon: "edit", onSelect: log("Edit result") },
    { label: "Swap teams", icon: "swap", onSelect: log("Swap teams") },
    { label: "Copy match link", icon: "link", onSelect: log("Copy match link") },
    {
      label: "Export CSV",
      icon: "export",
      disabled: true,
      onSelect: log("Export CSV"),
    },
    {
      label: "Delete match",
      icon: "trash",
      tone: "danger",
      onSelect: log("Delete match"),
    },
  ];

  const longMenu: MbMenuItem[] = [
    {
      label: "Reschedule every pending match on the north court",
      icon: "calendar",
      onSelect: log("Reschedule"),
    },
    { label: "Print the schedule", icon: "print", onSelect: log("Print") },
  ];

  const primary: MbAction = { label: "Create competition", icon: "check" };
  const back: MbAction = { label: "Back", icon: "chevron-left" };

  return (
    <section id="w1-p1-action-sharing" className="mt-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-mb-navy pb-2">
        <h2 className="matchbook-display text-2xl font-bold leading-none tracking-[0.05em]">
          Action &amp; <span className="text-mb-coral">Sharing</span>
        </h2>
        <p className="mb-kicker">
          W1 / P1 — MbCopyField · MbShareAction · MbMenu · MbActionBar
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* ---------------------------- left column: value + commit ----- */}
        <div className="flex flex-col gap-4 xl:col-span-7 xl:self-start">
          <Panel
            title="MbCopyField"
            icon="copy"
            meta={<span className="mb-kicker">clipboard → exec → manual</span>}
          >
            <ActionBlock label="Resting">
              <MbCopyField label="Share link" value={SHARE_URL} />
            </ActionBlock>

            <ActionBlock label="With help copy">
              <MbCopyField
                label="Viewer link"
                value={SHARE_URL}
                help="Anyone with this link can watch the scores live."
              />
            </ActionBlock>

            <ActionBlock label='secret — revealable defaults to true'>
              <MbCopyField
                label="Admin token"
                value={ADMIN_TOKEN}
                secret
                help="Grants scoring rights. Treat it like a password."
              />
            </ActionBlock>

            <ActionBlock label="Long value — truncates, never wraps the row">
              <MbCopyField label="Admin link" value={LONG_URL} />
            </ActionBlock>

            <ActionBlock label="Empty — both controls disabled, reason stated">
              <MbCopyField label="Session code" value="" />
            </ActionBlock>

            <ActionBlock label="Clipboard refused — the real fallback, not a mock">
              <div className="flex flex-col gap-3">
                <MbButton
                  variant={blocked ? "navy" : "outline-navy"}
                  size="sm"
                  icon={blocked ? "lock" : "key"}
                  aria-pressed={blocked}
                  onClick={() => setBlocked((b) => !b)}
                >
                  {blocked ? "Clipboard blocked" : "Block the clipboard"}
                </MbButton>
                <MbCopyField
                  label="Blocked link"
                  value={SHARE_URL}
                  help="Press Copy with the block on: the row turns red, the value is selected and the keyboard hint appears."
                />
              </div>
            </ActionBlock>
          </Panel>

          {/* --------------------------------------------- MbActionBar */}
          <Panel
            title="MbActionBar"
            icon="save"
            meta={
              <span className="mb-kicker tabular-nums" title={`${MB_ACTION_BAR_H} · ${MB_ACTION_BAR_H_STACKED}`}>
                73 · 97 · 152 px
              </span>
            }
          >
            <ActionBlock label="Primary only — takes the width on a phone, sits right above sm">
              <BarFrame>
                <MbActionBar primary={{ ...primary, onClick: log("Create competition") }} />
              </BarFrame>
            </ActionBlock>

            <ActionBlock label="Primary + secondary — a line each when they cannot share one">
              <BarFrame>
                <MbActionBar
                  secondary={{ ...back, onClick: log("Back") }}
                  primary={{ ...primary, onClick: log("Create competition") }}
                />
              </BarFrame>
            </ActionBlock>

            <ActionBlock label="With status — one row above sm, its own line below">
              <BarFrame>
                <MbActionBar
                  status="Step 2 of 3 · 8 teams selected"
                  secondary={{ ...back, onClick: log("Back") }}
                  primary={{ ...primary, onClick: log("Create competition") }}
                />
              </BarFrame>
            </ActionBlock>

            <ActionBlock label="Long status — the status truncates, the commit verb never does">
              <BarFrame>
                <MbActionBar
                  status="Every pending match on the north court will be rescheduled to Sunday afternoon before this saves"
                  secondary={{ ...back, onClick: log("Back") }}
                  primary={{ ...primary, onClick: log("Create competition") }}
                />
              </BarFrame>
            </ActionBlock>

            <ActionBlock label="Loading — click Save to arm it · link secondary">
              <BarFrame>
                <MbActionBar
                  status={committing ? "Saving…" : "Nothing in flight"}
                  secondary={{ label: "Cancel", href: "/dev/kit", icon: "close" }}
                  primary={{
                    label: "Save",
                    icon: "save",
                    loading: committing,
                    onClick: () => setCommitting((c) => !c),
                  }}
                />
              </BarFrame>
            </ActionBlock>

            <ActionBlock label="Disabled — both controls inert">
              <BarFrame>
                <MbActionBar
                  status="Nothing to submit yet"
                  secondary={{ ...back, disabled: true }}
                  primary={{ label: "Create competition", icon: "check", disabled: true }}
                />
              </BarFrame>
            </ActionBlock>

            <ActionBlock label="sticky={false} — ends the flow instead of pinning">
              <div className="-mx-4 border-y-[1.5px] border-mb-navy bg-mb-paper-bright">
                <BarRows count={3} />
                <MbActionBar
                  sticky={false}
                  status="Leaves with the content"
                  primary={{ ...primary, onClick: log("Create competition") }}
                />
              </div>
            </ActionBlock>
          </Panel>
        </div>

        {/* -------------------------- right column: share + overflow ---- */}
        <div className="flex flex-col gap-4 xl:col-span-5 xl:self-start">
          <Panel
            title="MbShareAction"
            icon="share"
            meta={<span className="mb-kicker">share → copy → dialog</span>}
          >
            <ActionBlock label='variant="button" — tones'>
              <div className="flex flex-wrap items-center gap-3">
                {(["navy", "coral", "outline", "outline-navy"] as const).map((tone) => (
                  <MbShareAction
                    key={tone}
                    variant="button"
                    tone={tone}
                    url={SHARE_URL}
                    title="Harbor Classic"
                    text="Follow the scores live."
                    onResult={setOutcome}
                  />
                ))}
              </div>
            </ActionBlock>

            <ActionBlock label='variant="button" — sizes sm / md / lg'>
              <div className="flex flex-wrap items-center gap-3">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <MbShareAction
                    key={size}
                    variant="button"
                    size={size}
                    url={SHARE_URL}
                    title="Harbor Classic"
                    text="Follow the scores live."
                    onResult={setOutcome}
                  />
                ))}
              </div>
            </ActionBlock>

            <ActionBlock label='variant="icon" — 44px, name never changes'>
              <div className="flex flex-wrap items-center gap-3">
                {(["plain", "navy", "outline-navy"] as const).map((tone) => (
                  <MbShareAction
                    key={tone}
                    variant="icon"
                    tone={tone}
                    url={SHARE_URL}
                    title="Harbor Classic"
                    text="Follow the scores live."
                    onResult={setOutcome}
                  />
                ))}
              </div>
            </ActionBlock>

            <ActionBlock label="Custom label · disabled — nothing to share yet">
              <div className="flex flex-wrap items-center gap-3">
                <MbShareAction
                  variant="button"
                  label="Share live scores"
                  url={SHARE_URL}
                  title="Harbor Classic"
                  text="Follow the scores live."
                  onResult={setOutcome}
                />
                <MbShareAction
                  variant="button"
                  disabled
                  url=""
                  title="Harbor Classic"
                  text="Follow the scores live."
                />
                <MbShareAction variant="icon" disabled url="" title="Harbor Classic" text="" />
              </div>
            </ActionBlock>

            <ActionBlock label="Last outcome reported to onResult">
              <span className="mb-code-chip">
                <MbIcon id="share" size={13} />
                {outcome ?? "—"}
              </span>
            </ActionBlock>
          </Panel>

          {/* -------------------------------------------------- MbMenu */}
          <Panel
            title="MbMenu"
            icon="more"
            meta={<span className="mb-kicker">&gt; 2 actions</span>}
          >
            <ActionBlock label="Default trigger — 44px, icon only">
              <div className="flex items-center justify-between gap-3 border-[1.5px] border-mb-navy bg-mb-paper-bright px-3 py-2">
                <span className="matchbook-display min-w-0 truncate text-[0.85rem] font-semibold tracking-[0.05em]">
                  Surge <span className="tabular-nums text-mb-ink-muted">21</span> — Riptide{" "}
                  <span className="tabular-nums text-mb-ink-muted">18</span>
                </span>
                <MbMenu label="Match actions" items={matchMenu} />
              </div>
            </ActionBlock>

            <ActionBlock label="Text trigger — label must contain the visible words">
              <MbMenu
                label="Round actions"
                trigger={
                  <>
                    Round actions
                    <MbIcon id="chevron-down" size={12} className="shrink-0" />
                  </>
                }
                items={longMenu}
                align="start"
              />
            </ActionBlock>

            <ActionBlock label="One item · none — an empty menu renders no trigger">
              <div className="flex items-center gap-4">
                <MbMenu
                  label="Team actions"
                  items={[{ label: "Rename team", icon: "edit", onSelect: log("Rename team") }]}
                />
                <MbMenu label="No actions" items={[]} />
                <span className="text-[0.78rem] text-mb-ink-muted">
                  Second trigger is absent by design.
                </span>
              </div>
            </ActionBlock>

            <ActionBlock label="Last selection">
              <span className="mb-code-chip">
                <MbIcon id="check" size={13} />
                {picked}
              </span>
            </ActionBlock>
          </Panel>
        </div>

      </div>
    </section>
  );
};

/* ===================================================================== */
/* W1 / P1 — Selection & list display                                    */
/* ===================================================================== */

interface KitEntry {
  id: string;
  team: MbTeam;
  accent: string;
  record: string;
  joined: string;
}

const KIT_ENTRIES: KitEntry[] = [
  {
    id: "surge",
    team: { name: "Harbor Surge", crest: crestPath("surge") },
    accent: "var(--mb-teal)",
    record: "6–1",
    joined: "Mar 04",
  },
  {
    id: "tide",
    team: { name: "Northern Tide", crest: crestPath("tide") },
    accent: "var(--mb-navy)",
    record: "5–2",
    joined: "Mar 04",
  },
  {
    id: "storm",
    team: { name: "Granite Storm", crest: crestPath("storm") },
    accent: "var(--mb-plum)",
    record: "5–2",
    joined: "Mar 11",
  },
  {
    id: "apex",
    team: { name: "Apex Athletic", crest: crestPath("apex") },
    accent: "var(--mb-gold)",
    record: "4–3",
    joined: "Mar 11",
  },
  {
    id: "flare",
    team: { name: "Solstice Flare", crest: crestPath("flare") },
    accent: "var(--mb-red)",
    record: "3–4",
    joined: "Mar 18",
  },
  {
    id: "peak",
    team: { name: "Summit Peak", crest: crestPath("peak") },
    accent: "var(--mb-green)",
    record: "2–5",
    joined: "Mar 18",
  },
  {
    id: "nova",
    team: { name: "Meridian Nova", crest: crestPath("nova") },
    accent: "var(--mb-teal)",
    record: "2–5",
    joined: "Apr 02",
  },
  {
    id: "riptide",
    team: {
      name: "Wallingford Community Centre Riptide",
      crest: crestPath("riptide"),
    },
    accent: "var(--mb-ink-muted)",
    record: "1–6",
    joined: "Apr 02",
  },
];

/* Module scope, so the memoised rows actually keep their memo. */
const getEntryKey = (entry: KitEntry) => entry.id;

const renderKitEntry = (entry: KitEntry) => (
  <TeamMark team={entry.team} size="sm" accent={entry.accent} />
);

const KIT_COLUMNS: MbSelectColumn<KitEntry>[] = [
  {
    key: "record",
    header: "W–L",
    render: (entry) => entry.record,
    width: "3rem",
    align: "right",
  },
  {
    key: "joined",
    header: "Entered",
    render: (entry) => entry.joined,
    width: "4rem",
    align: "right",
    hide: "sm",
  },
];

interface KitSeed {
  id: string;
  label: string;
  club: string;
}

const KIT_CLUBS = ["Harbor", "Northern", "Granite", "Apex", "Solstice", "Summit"];

const KIT_SEEDS: KitSeed[] = Array.from({ length: 120 }, (_, index) => ({
  id: `seed-${index + 1}`,
  label: `Entry ${String(index + 1).padStart(3, "0")}`,
  club: `${KIT_CLUBS[index % KIT_CLUBS.length]} club`,
}));

const getSeedKey = (seed: KitSeed) => seed.id;

const renderKitSeed = (seed: KitSeed) => (
  <span className="flex min-w-0 items-baseline gap-2">
    <span className="matchbook-display truncate text-[0.82rem] font-bold tabular-nums">
      {seed.label}
    </span>
    <span className="truncate text-[0.72rem] text-mb-ink-muted">{seed.club}</span>
  </span>
);

const NO_SELECTION: Set<string> = new Set();
const ALL_OF_THREE: Set<string> = new Set(["surge", "tide", "storm"]);

interface KitQueueItem {
  id: string;
  fixture: string;
  venue: string;
}

const KIT_QUEUE: KitQueueItem[] = [
  { id: "q1", fixture: "Surge vs Riptide", venue: "Court 1 — 19:00" },
  { id: "q2", fixture: "Storm vs Apex", venue: "Court 2 — 19:00" },
  { id: "q3", fixture: "Tide vs Peak", venue: "Court 1 — 19:40" },
  { id: "q4", fixture: "Flare vs Nova", venue: "Court 2 — 19:40" },
  {
    id: "q5",
    fixture: "Wallingford Community Centre Riptide vs Meridian Nova",
    venue: "Court 1 — 20:20",
  },
  { id: "q6", fixture: "Apex vs Surge", venue: "Court 2 — 20:20" },
];

const renderKitQueue = (item: KitQueueItem) => (
  <span className="flex min-w-0 flex-col gap-0.5">
    <span className="matchbook-display line-clamp-2 text-[0.85rem] font-bold leading-tight tabular-nums">
      {item.fixture}
    </span>
    <span className="mb-kicker truncate tabular-nums">{item.venue}</span>
  </span>
);

const KIT_STEPS: MbStep[] = [
  { id: "format", label: "Format", value: "Round Robin" },
  { id: "teams", label: "Teams", value: "8 entered" },
  { id: "details", label: "Details", value: "Summer League" },
  { id: "review", label: "Review" },
];

const KIT_STEPS_SHORT: MbStep[] = [
  { id: "teams", label: "Teams" },
  { id: "details", label: "Details" },
];

const KIT_STEPS_LONG: MbStep[] = [
  {
    id: "a",
    label: "Competition format",
    value: "Two match rotation with instant win",
  },
  { id: "b", label: "Participating teams", value: "12 of 48 teams selected" },
  {
    id: "c",
    label: "Scoring and venues",
    value: "Wallingford Community Centre, Court 1",
  },
];

/** Skeleton twin of a `MbSelectList` row — same 48px pitch, same gutters. */
const KitSelectSkeletonRow = () => (
  <div
    className="flex items-center gap-3 border-b border-mb-rule px-3 last:border-b-0"
    style={{ height: 48 }}
  >
    <span
      aria-hidden="true"
      className="h-[18px] w-[18px] shrink-0 rounded-[2px] border-[1.5px] border-mb-rule"
    />
    <MbSkeleton w={22} h={26} radius={3} />
    <MbSkeleton w="45%" h={11} />
    <MbSkeleton w="2.5rem" h={11} className="ml-auto" />
  </div>
);

const SelectionListsSection = () => {
  const [format, setFormat] =
    useState<(typeof FORMAT_ORDER)[number]>("round_robin");
  const [tool, setTool] = useState("queue");
  const [step, setStep] = useState("teams");
  const [longStep, setLongStep] = useState("c");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["surge", "storm"]),
  );
  const [query, setQuery] = useState("");
  const [seedSelected, setSeedSelected] = useState<Set<string>>(() => new Set());
  const [queue, setQueue] = useState(KIT_QUEUE);

  const toggleEntry = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  const toggleSeed = useCallback((key: string) => {
    setSeedSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  const entries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return KIT_ENTRIES;
    return KIT_ENTRIES.filter((entry) =>
      entry.team.name.toLowerCase().includes(needle),
    );
  }, [query]);

  const toggleShownEntries = () => {
    const keys = entries.map(getEntryKey);
    setSelected((prev) => {
      const allOn = keys.every((key) => prev.has(key));
      const next = new Set(prev);
      for (const key of keys) {
        if (allOn) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const toggleAllSeeds = () => {
    setSeedSelected((prev) =>
      prev.size === KIT_SEEDS.length ? new Set() : new Set(KIT_SEEDS.map(getSeedKey)),
    );
  };

  const stepIndex = KIT_STEPS.findIndex((entry) => entry.id === step);

  return (
    <section id="w1-p1-selection-lists" className="mt-10">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[1.5px] border-mb-navy pb-2">
        <h2 className="matchbook-display text-2xl font-bold leading-none tracking-[0.05em]">
          Selection <span className="text-mb-coral">&amp; Lists</span>
        </h2>
        <p className="mb-kicker tabular-nums">
          W1 / P1 — MbChoiceCard · MbStepRail · MbSelectList · MbReorderList
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* ------------------------------------------------- MbChoiceCard */}
        <div className="xl:col-span-12">
          <Panel
            title="MbChoiceCard"
            icon="grid"
            meta={
              <span className="mb-kicker tabular-nums">
                Accent is a rail, never ink — gold reads 2.15:1 as a glyph
              </span>
            }
          >
            <KitBlock label="Format grid — single select, live, one entry disabled">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {FORMAT_ORDER.map((type) => {
                  const meta = FORMAT_META[type];
                  return (
                    <MbChoiceCard
                      key={type}
                      icon={meta.icon}
                      accent={meta.accent}
                      title={meta.label}
                      description={meta.blurb}
                      kicker={`${countOf(meta.minTeams, "team")} minimum`}
                      selected={format === type}
                      onSelect={() => setFormat(type)}
                      disabledReason={
                        type === "double_elimination"
                          ? "Needs 4 teams — 2 entered so far."
                          : undefined
                      }
                    />
                  );
                })}
              </div>
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Selected format:{" "}
                <span className="matchbook-display font-bold text-mb-navy">
                  {FORMAT_META[format].label}
                </span>
              </p>
            </KitBlock>

            <KitBlock label="No accent, no kicker, long title and blurb, disabled">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <MbChoiceCard
                  icon="volleyball"
                  title="Volleyball rotation designer with libero tracking"
                  description="Draw the six starting positions, step every rotation, and check each overlap constraint frame by frame before the sheet goes to print."
                  selected={tool === "designer"}
                  onSelect={() => setTool("designer")}
                />
                <MbChoiceCard
                  icon="queue"
                  accent="var(--mb-gold)"
                  title="Queue editor"
                  description="Reorder the waiting matches."
                  kicker="Rotation formats only"
                  selected={tool === "queue"}
                  onSelect={() => setTool("queue")}
                />
                <MbChoiceCard
                  icon="lock"
                  accent="var(--mb-plum)"
                  title="Shared scoring"
                  description="Hand a second device a link and let it score the same match live."
                  selected={false}
                  onSelect={() => setTool("shared")}
                  disabledReason="Sign in and open a session before sharing a match."
                />
              </div>
            </KitBlock>
          </Panel>
        </div>

        {/* --------------------------------------------------- MbStepRail */}
        <div className="xl:col-span-7">
          <Panel
            title="MbStepRail"
            icon="clipboard"
            meta={
              <span className="mb-kicker">Completed steps are the only links</span>
            }
          >
            <KitBlock label="Horizontal — live; click a completed step to go back">
              <MbStepRail
                steps={KIT_STEPS}
                current={step}
                onNavigate={setStep}
                label="New competition progress"
              />
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <MbButton
                  variant="outline-navy"
                  size="sm"
                  icon="chevron-left"
                  disabled={stepIndex <= 0}
                  onClick={() => setStep(KIT_STEPS[stepIndex - 1].id)}
                >
                  Back
                </MbButton>
                <MbButton
                  variant="coral"
                  size="sm"
                  iconRight="chevron-right"
                  disabled={stepIndex >= KIT_STEPS.length - 1}
                  onClick={() => setStep(KIT_STEPS[stepIndex + 1].id)}
                >
                  Next
                </MbButton>
                <span className="mb-kicker ml-auto tabular-nums">
                  Step {stepIndex + 1} of {KIT_STEPS.length}
                </span>
              </div>
            </KitBlock>

            <KitBlock label="First step — nothing behind it, so nothing is clickable">
              <MbStepRail
                steps={KIT_STEPS}
                current="format"
                onNavigate={() => {}}
                label="Progress at the first step"
              />
            </KitBlock>

            <KitBlock label="Last step — everything behind it is a link">
              <MbStepRail
                steps={KIT_STEPS}
                current="review"
                onNavigate={() => {}}
                label="Progress at the last step"
              />
            </KitBlock>

            <KitBlock label="Two steps, no values">
              <div className="max-w-[320px]">
                <MbStepRail
                  steps={KIT_STEPS_SHORT}
                  current="details"
                  onNavigate={() => {}}
                  label="Two-step progress"
                />
              </div>
            </KitBlock>

            <KitBlock label="Vertical — long labels and values truncate at 220px">
              <div className="max-w-[220px]">
                <MbStepRail
                  steps={KIT_STEPS_LONG}
                  current={longStep}
                  onNavigate={setLongStep}
                  orientation="vertical"
                  label="Wizard progress, vertical"
                />
              </div>
            </KitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------ MbReorderList */}
        <div className="xl:col-span-5">
          <Panel
            title="MbReorderList"
            icon="queue"
            meta={<span className="mb-kicker">Grip · chevrons · Alt+arrows</span>}
          >
            <KitBlock label="Match queue — live, six rows">
              <MbReorderList
                items={queue}
                getKey={(item) => item.id}
                getLabel={(item) => item.fixture}
                label="Match queue"
                onReorder={(from, to) =>
                  setQueue((prev) => mbReorder(prev, from, to))
                }
                renderItem={renderKitQueue}
              />
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Hold the grip and drag on mouse, pen or finger; or use the chevrons;
                or press Alt with the arrow keys. Every move is announced through one
                polite live region and focus follows the row.
              </p>
            </KitBlock>

            <KitBlock label="One row — every control locks itself">
              <MbReorderList
                items={KIT_QUEUE.slice(0, 1)}
                getKey={(item) => item.id}
                getLabel={(item) => item.fixture}
                label="Single-row queue"
                onReorder={() => {}}
                renderItem={renderKitQueue}
              />
            </KitBlock>

            <KitBlock label="Disabled">
              <MbReorderList
                items={KIT_QUEUE.slice(0, 2)}
                getKey={(item) => item.id}
                getLabel={(item) => item.fixture}
                label="Locked queue"
                onReorder={() => {}}
                renderItem={renderKitQueue}
                disabled
              />
            </KitBlock>

            <KitBlock label="Empty">
              <MbReorderList
                items={[] as KitQueueItem[]}
                onReorder={() => {}}
                renderItem={renderKitQueue}
                label="Empty queue"
                emptyMessage="No matches are queued yet — start a rotation and they appear here."
              />
            </KitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------- MbSelectList */}
        <div className="xl:col-span-7">
          <Panel
            title="MbSelectList"
            icon="teams"
            meta={
              <span className="mb-kicker tabular-nums">
                {selected.size} of {KIT_ENTRIES.length} selected
              </span>
            }
          >
            <KitBlock label="Search · select all · two columns — live">
              <MbSelectList
                items={entries}
                getKey={getEntryKey}
                selected={selected}
                onToggle={toggleEntry}
                onSelectAll={toggleShownEntries}
                search={query}
                onSearchChange={setQuery}
                columns={KIT_COLUMNS}
                renderPrimary={renderKitEntry}
                emptyMessage="No team matches that search — clear it to see all eight."
                label="Competition entrants"
              />
            </KitBlock>

            <KitBlock label="The minimum call — no search, no select all, no columns">
              <MbSelectList
                items={KIT_ENTRIES.slice(0, 4)}
                getKey={getEntryKey}
                selected={selected}
                onToggle={toggleEntry}
                renderPrimary={renderKitEntry}
                emptyMessage="No teams are shortlisted yet."
                label="Shortlist"
              />
            </KitBlock>

            <KitBlock label="Search with no match — the field stays, the body says why">
              <MbSelectList
                items={[] as KitEntry[]}
                getKey={getEntryKey}
                selected={NO_SELECTION}
                onToggle={() => {}}
                onSelectAll={() => {}}
                search="zebra"
                onSearchChange={() => {}}
                columns={KIT_COLUMNS}
                renderPrimary={renderKitEntry}
                emptyMessage="No team matches that search — clear it to see all eight."
                label="Filtered entrants"
              />
            </KitBlock>

            <KitBlock label="Everything selected — the head reads Clear all">
              <MbSelectList
                items={KIT_ENTRIES.slice(0, 3)}
                getKey={getEntryKey}
                selected={ALL_OF_THREE}
                onToggle={() => {}}
                onSelectAll={() => {}}
                columns={KIT_COLUMNS}
                renderPrimary={renderKitEntry}
                emptyMessage="No teams."
                label="Fully selected list"
              />
            </KitBlock>
          </Panel>
        </div>

        {/* ----------------------------------------- MbSelectList — edges */}
        <div className="xl:col-span-5">
          <Panel
            title="MbSelectList — edges"
            icon="filter"
            meta={
              <span className="mb-kicker">Windowed · empty · loading · error</span>
            }
          >
            <KitBlock label="120 rows — windowed, 9 rows in view">
              <MbSelectList
                items={KIT_SEEDS}
                getKey={getSeedKey}
                selected={seedSelected}
                onToggle={toggleSeed}
                onSelectAll={toggleAllSeeds}
                renderPrimary={renderKitSeed}
                emptyMessage="The waiting list is empty."
                label="Waiting list"
              />
            </KitBlock>

            <KitBlock label="Empty">
              <MbSelectList
                items={[] as KitEntry[]}
                getKey={getEntryKey}
                selected={NO_SELECTION}
                onToggle={() => {}}
                onSelectAll={() => {}}
                renderPrimary={renderKitEntry}
                emptyMessage="No teams exist yet — add one and it appears here."
                label="Entrants"
              />
            </KitBlock>

            <KitBlock label="Loading twin — skeleton at the final row geometry">
              <div className="flex min-h-[44px] items-center gap-3 border-b-[1.5px] border-mb-navy px-3">
                <span
                  aria-hidden="true"
                  className="h-[18px] w-[18px] shrink-0 rounded-[2px] border-[1.5px] border-mb-rule"
                />
                <MbSkeleton w="5rem" h={9} />
              </div>
              <KitSelectSkeletonRow />
              <KitSelectSkeletonRow />
              <KitSelectSkeletonRow />
            </KitBlock>

            <KitBlock label="Error twin — PanelEmpty carries the failure tones">
              <PanelEmpty
                tone="error"
                message="The entrant list could not be loaded. Check the connection and try again."
                actionLabel="Retry"
                onAction={() => {}}
              />
            </KitBlock>
          </Panel>
        </div>
      </div>
    </section>
  );
};

/* ===================================================================== */

export default function DevKitPage() {
  return (
    <div className="matchbook-surface min-h-screen p-6">
      <h1 className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
        Matchbook <span className="text-mb-coral">Kit</span>
      </h1>
      <p className="mb-kicker mt-2">Primitive gallery — dev only</p>

      <CoreControlsSection />
      <LogicAndPanelSection />
      <FormKitSection />
      <OverlaysAndFeedbackSection />
      <ScoreAndStatusSection />
      <ActionAndSharingSection />
      <SelectionListsSection />
      {/* APPEND YOUR SECTION COMPONENT ABOVE THIS LINE */}
    </div>
  );
}
