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

import { useState } from "react";
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

/* ===================================================================== */
/* W1 / P1 — Core controls                                               */
/* ===================================================================== */

const BUTTON_VARIANTS: MbButtonVariant[] = ["coral", "navy", "outline", "outline-navy"];
const BUTTON_SIZES: MbButtonSize[] = ["sm", "md", "lg", "touch"];
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
    <p className="mb-kicker mb-3">{label}</p>
    {children}
  </div>
);

const CoreControlsSection = () => {
  const [tab, setTab] = useState("bracket");
  const [round, setRound] = useState("r3");
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
        <p className="mb-kicker">
          W1 / P1 — MbButton · MbIconButton · MbBadge · MbTabs · MbSegmented
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* ---------------------------------------------------- MbButton */}
        <div className="xl:col-span-7">
          <Panel title="MbButton" icon="check" meta={<span className="mb-kicker">4 variants</span>}>
            {BUTTON_SIZES.map((size) => (
              <KitBlock key={size} label={`size="${size}"`}>
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
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Every size clears 44px. Loading keeps focus, blocks activation and never
                animates — the glyph is static and the label holds its width.
              </p>
            </KitBlock>
          </Panel>
        </div>

        {/* ------------------------------------------------ MbIconButton */}
        <div className="xl:col-span-5">
          <Panel title="MbIconButton" icon="more" meta={<span className="mb-kicker">44 / 56</span>}>
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
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                Every one carries both <code>title</code> and <code>aria-label</code> from the
                required <code>label</code> prop.
              </p>
            </KitBlock>
          </Panel>
        </div>

        {/* ----------------------------------------------------- MbBadge */}
        <div className="xl:col-span-7">
          <Panel title="MbBadge" icon="live" meta={<span className="mb-kicker">9 tones</span>}>
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
              <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                <code>solid</code> is permitted for <code>live</code> only — every other tone
                degrades to <code>framed</code>, which is why the Solid column above reads as
                frames. Letterforms stay navy; the tone rides the dot, the square or the rule.
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

            <KitBlock label="Overflow — scrolls, never squeezes">
              <MbTabs
                value={round}
                onValueChange={setRound}
                items={Array.from({ length: 9 }, (_, i) => ({
                  value: `r${i + 1}`,
                  label: `Round ${i + 1}`,
                  count: 12 - i,
                }))}
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
            meta={<span className="mb-kicker">role=radiogroup</span>}
          >
            <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-12">
              <div className="xl:col-span-4">
                <p className="mb-kicker mb-3">size=&quot;md&quot; — 48px, icons</p>
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
                <p className="mb-kicker mb-3">size=&quot;sm&quot; — 44px, fullWidth={"{false}"}</p>
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
                <p className="mt-3 text-[0.72rem] text-mb-ink-muted">
                  Shrinks to its content instead of stretching; the 1.5px navy gaps are the
                  dividing rules.
                </p>
              </div>

              <div className="xl:col-span-4">
                <p className="mb-kicker mb-3">Long labels — wraps, never truncates</p>
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
                <p className="mb-kicker mb-3">
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
                <p className="mb-kicker mb-3">Empty</p>
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
  "practice court",
];

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
            meta={<span className="mb-kicker">One table, five formats</span>}
          >
            {FORMAT_ORDER.map((type) => {
              const meta = FORMAT_META[type];
              return (
                <div
                  key={type}
                  className="mb-row-hover flex items-start gap-3 border-t border-mb-rule px-4 py-3.5 first:border-t-0"
                  style={{ boxShadow: `inset 3px 0 0 ${meta.accent}` }}
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
                  <div className="mb-input min-h-[44px]">
                    <input
                      type="text"
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
                        <td className={wrong ? "text-mb-red" : "text-mb-ink-muted"}>
                          {wrong ? `${naive} — wrong` : naive}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* --------------------------------------- useMbReducedMotion() */}
        <div className="xl:col-span-5">
          <Panel title="useMbReducedMotion()" icon="live">
            <div className="flex flex-col gap-3 p-4">
              <div className="mb-tile flex items-center gap-3 rounded-[3px] px-3.5 py-3">
                <span className="mb-icon-disc h-11 w-11">
                  <MbIcon id={reducedMotion ? "check" : "refresh"} size={20} />
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
            meta={<span className="mb-kicker">Accent is a 3px bar, never a fill</span>}
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

export default function DevKitPage() {
  return (
    <div className="matchbook-surface min-h-screen p-6">
      <h1 className="matchbook-display text-4xl font-bold leading-none tracking-[0.01em] sm:text-5xl">
        Matchbook <span className="text-mb-coral">Kit</span>
      </h1>
      <p className="mb-kicker mt-2">Primitive gallery — dev only</p>

      <CoreControlsSection />
      <LogicAndPanelSection />
      {/* APPEND YOUR SECTION COMPONENT ABOVE THIS LINE */}
    </div>
  );
}
