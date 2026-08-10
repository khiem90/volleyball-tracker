"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MbIcon } from "./MbIcon";
import { MbMatchRow } from "./MatchRow";
import { MbSegmented } from "./Segmented";
import { Crest, PanelEmpty } from "./Panel";
import {
  bracketConnectorPaths,
  layoutBracket,
  MB_CELL_H,
  MB_CELL_W,
  MB_COL_GAP,
  type MbBracketCellData,
  type MbBracketChampion,
  type MbBracketRound,
  type MbBracketSection,
  type MbBracketAccent,
  type SectionLayout,
} from "./bracketLayout";
import type { MbTeam } from "./types";

/** Section identity is a 3px inset rail, never a tinted heading. */
const ACCENT_VAR: Record<MbBracketAccent, string> = {
  teal: "var(--mb-teal)",
  gold: "var(--mb-gold)",
  coral: "var(--mb-coral)",
  plum: "var(--mb-plum)",
};

export {
  layoutBracket,
  bracketConnectorPaths,
  MB_CELL_W,
  MB_CELL_H,
  MB_ROW_GAP,
  MB_COL_GAP,
} from "./bracketLayout";
export type {
  MbBracketCellData,
  MbBracketRound,
  MbBracketSection,
  MbBracketAccent,
  MbBracketChampion,
} from "./bracketLayout";

/* ===========================================================================
   THE BRACKET RAIL (charter §2.3, W4 / P3a)

   Two brackets ship today and neither is readable.

   `Bracket.tsx` absolutely positions every card inside a `relative` box
   (`BracketMatchCard.tsx:61-63`), so a card contributes **no intrinsic width**
   to its flex column and `Bracket.tsx:74`'s `justify-between` sizes each round
   from its LABEL. Reproduced: at 390px the Semi-Finals cards render on top of
   the Quarter-Finals cards; at 1440px with 8 or 16 teams the Finals card is
   sliced in half at the panel edge (BUG-1). It then reserves
   `140 * 2^(round-1)` px per slot, so a finals match owns 560px of mostly
   whitespace (BUG-2), and draws a 16px stub instead of a tree, so nothing says
   which cell feeds which (BUG-3). `DoubleBracket.tsx` avoids all three by
   laying out in normal flow — with a second, incompatible match card, three
   independent horizontal scrollers and clipped round headings (BUG-10).

   ------------------------------------------------------------- the geometry

   This rail computes its layout ARITHMETICALLY and never measures the DOM
   (charter §2.3, comp-detail R2). Every cell is `MB_CELL_W x MB_CELL_H`, every
   column is exactly `MB_CELL_W` wide, and the canvas height is known before a
   single node mounts:

     round 0   centre(0, i) = offset + i * (CELL_H + ROW_GAP) + CELL_H / 2
     round r   centre(r, i) = (centre(r-1, 2i) + centre(r-1, 2i+1)) / 2

   which is the charter's rule verbatim: round *r* holds `2^(R-r)` cells and
   cell *i* centres between children `2i` and `2i+1`. The rhythm is LINEAR —
   a finals cell sits at the mean of its two feeders rather than inside an
   exponentially tall slot — so a 16-team bracket is 15 cells in 1,470px of
   canvas instead of 15 cells in 4,500px.

   A round whose cell count is not exactly half its predecessor's is RAGGED —
   the losers side of a double-elimination bracket is full of them — and is
   distributed evenly down the canvas instead, with **no connectors drawn into
   it**. A drawn line that does not describe a real parent/child relationship
   is worse than no line, so the code refuses to guess.

   Nothing here animates and nothing here is measured: `ResizeObserver` on a
   horizontally scrolling container re-runs on every resize and produces elbows
   that slide, and a bracket that reflows is unreadable (§4, "Must NOT
   animate").

   ------------------------------------------------------------------ mobile

   A 16-team rail is 1,176px wide. On a 390px screen that is not a bracket, it
   is a filing cabinet. Below `sm` the rail therefore defaults to a vertical
   ROUNDS LIST of the same matches — the same `MbMatchRow` the schedule uses,
   grouped by round, with a real 44px edit key — and a segmented control
   switches to the rail for anyone who wants it. The control is `sm:hidden`
   because above `sm` there is no choice to offer.
   =========================================================================== */

/* ------------------------------------------------------------------- cell */

const CellSide = ({
  team,
  score,
  won,
  showScore,
  last = false,
}: {
  team: MbTeam | null;
  score: number;
  won: boolean;
  showScore: boolean;
  last?: boolean;
}) => (
  <span
    className={`flex h-8 items-center gap-1.5 px-2 ${
      last ? "" : "border-b border-mb-rule"
    }`}
  >
    {team ? (
      <Crest team={team} size={15} />
    ) : (
      /* A dashed 3px square, not a dot: an unresolved slot is a SHAPE here, so
         it survives greyscale beside a real crest. */
      <span
        aria-hidden="true"
        className="block h-[13px] w-[13px] shrink-0 rounded-[2px] border border-dashed border-mb-rule"
      />
    )}
    <span
      className={`matchbook-display min-w-0 flex-1 truncate text-[0.72rem] ${
        team
          ? won
            ? "font-bold"
            : "font-semibold text-mb-ink-muted"
          : "font-semibold text-mb-ink-muted"
      }`}
    >
      {team?.name ?? "TBD"}
    </span>
    {showScore && (
      <span
        className={`matchbook-display shrink-0 text-[0.78rem] tabular-nums ${
          won ? "font-bold" : "font-semibold text-mb-ink-muted"
        }`}
      >
        {score}
      </span>
    )}
  </span>
);

const FootWord = ({ cell }: { cell: MbBracketCellData }) => {
  if (cell.live) {
    return (
      <span className="mb-kicker flex items-center gap-1 text-mb-navy">
        <span className="mb-live-dot" />
        Live
      </span>
    );
  }
  if (cell.bye) return <span className="mb-kicker">Bye</span>;
  if (cell.tbd) return <span className="mb-kicker">Awaiting</span>;
  if (cell.pending) return <span className="mb-kicker">To play</span>;
  return <span className="mb-kicker">Final</span>;
};

/**
 * One bracket cell. It participates in layout — a fixed `MB_CELL_W` box inside
 * a column of the same fixed width — which is the whole of the BUG-1 fix.
 *
 * The entire cell is the target when it is openable (156 x 90, comfortably over
 * the 44px floor) and there is no separate edit key: the match sheet the cell
 * opens carries "Change teams", which is how the edit path stops being a
 * hover-only 24px pencil (BUG-9). `memo` is preserved from `BracketMatchCard`,
 * which was already memoised (comp-detail R4).
 */
const BracketCellInner = ({
  cell,
  onSelect,
}: {
  cell: MbBracketCellData;
  onSelect?: (id: string) => void;
}) => {
  const showScore = !cell.pending && !cell.tbd && !cell.bye;
  const openable = Boolean(onSelect) && !cell.tbd && !cell.bye;

  const body = (
    <>
      <CellSide
        team={cell.home}
        score={cell.homeScore}
        won={cell.homeWon}
        showScore={showScore}
      />
      <CellSide
        team={cell.bye ? null : cell.away}
        score={cell.awayScore}
        won={cell.awayWon}
        showScore={showScore}
      />
      <span className="flex h-6 items-center justify-between gap-1 border-t border-mb-rule px-2">
        {cell.label ? (
          <span className="mb-kicker truncate tabular-nums">{cell.label}</span>
        ) : (
          <span />
        )}
        <FootWord cell={cell} />
      </span>
    </>
  );

  const frame = `mb-tile flex flex-col overflow-hidden rounded-[3px] text-left ${
    cell.tbd ? "bg-[var(--mb-tint-1)]" : ""
  }`;
  const style = {
    width: MB_CELL_W,
    height: MB_CELL_H,
    ...(cell.live ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" } : null),
  };

  if (!openable) {
    return (
      <span className={frame} style={style}>
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(cell.id)}
      aria-label={`Open ${cell.home?.name ?? "TBD"} v ${cell.away?.name ?? "TBD"}`}
      className={`${frame} transition-colors hover:bg-[var(--mb-tint-1)]`}
      style={style}
    >
      {body}
    </button>
  );
};

export const MbBracketCell = memo(BracketCellInner);
MbBracketCell.displayName = "MbBracketCell";

/* ------------------------------------------------------------- connectors */

/**
 * The tree, drawn from `layoutBracket`'s numbers and nothing else.
 *
 * One `<svg>` per section — not one per cell — so a re-render of a single cell
 * cannot re-render the overlay (comp-detail R4). It is `aria-hidden` and
 * `pointer-events: none`: it is a picture of a relationship the cells already
 * state in words, and it must never intercept a tap meant for a cell.
 */
export const BracketConnectors = ({ layout }: { layout: SectionLayout }) => {
  const paths = useMemo(() => bracketConnectorPaths(layout), [layout]);

  if (paths.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0"
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      shapeRendering="crispEdges"
    >
      {paths.map((path, i) => (
        <path
          key={i}
          d={path.d}
          fill="none"
          strokeWidth={path.live ? 2 : 1}
          stroke={path.live ? "var(--mb-coral)" : "var(--mb-rule)"}
        />
      ))}
    </svg>
  );
};

/* ------------------------------------------------------------ the section */

const RailSection = ({
  section,
  layout,
  onSelect,
  showLabel,
}: {
  section: MbBracketSection;
  layout: SectionLayout;
  onSelect?: (id: string) => void;
  showLabel: boolean;
}) => (
  <div
    className={showLabel ? "border-t border-mb-navy pl-3 pt-3" : ""}
    style={
      showLabel
        ? { boxShadow: `inset 3px 0 0 ${ACCENT_VAR[section.accent]}` }
        : undefined
    }
  >
    {showLabel && (
      <h3 className="mb-kicker mb-2 text-mb-navy">{section.label}</h3>
    )}

    {/* Round headings. A flex row of fixed-width cells so each heading sits
        over its own column — `Bracket.tsx` used `<span>`s with no heading
        structure at all and `DoubleBracket.tsx` used `<h3>` inconsistently. */}
    <div className="flex" style={{ gap: MB_COL_GAP }}>
      {layout.columns.map((column) => (
        <h4
          key={column.label}
          className="mb-kicker shrink-0 truncate pb-2"
          style={{ width: MB_CELL_W, scrollSnapAlign: "start" }}
        >
          {column.label}
        </h4>
      ))}
    </div>

    <div
      className="relative"
      style={{ width: layout.width, height: layout.height }}
    >
      <BracketConnectors layout={layout} />
      {layout.columns.map((column, r) => (
        <div
          key={`${column.label}-${r}`}
          className="absolute top-0"
          style={{
            left: r * (MB_CELL_W + MB_COL_GAP),
            width: MB_CELL_W,
            height: layout.height,
            scrollSnapAlign: "start",
          }}
        >
          {column.cells.map((placed) => (
            <div
              key={placed.cell.id}
              className="absolute left-0"
              style={{ top: placed.top }}
            >
              <MbBracketCell cell={placed.cell} onSelect={onSelect} />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/* --------------------------------------------------------------- champion */

export const MbBracketChampionBlock = ({
  champion,
}: {
  champion: MbBracketChampion;
}) => (
  <div className="flex items-center gap-4 border-b border-mb-navy bg-mb-navy px-4 py-3.5 text-mb-paper-bright">
    <Crest team={champion.team} size={44} />
    <div className="min-w-0">
      <p
        className="mb-kicker"
        /* `.mb-kicker` is ink-muted, which invariant 11 forbids on navy. */
        style={{ color: "var(--mb-gold)" }}
      >
        {champion.caption ?? "Champion"}
      </p>
      <p className="matchbook-display truncate text-[1.5rem] font-bold leading-tight tracking-[0.02em]">
        {champion.team.name}
      </p>
      {champion.score && (
        <p className="matchbook-display text-[0.78rem] font-semibold tabular-nums tracking-[0.08em]">
          {champion.score}
        </p>
      )}
    </div>
  </div>
);

/* ------------------------------------------------------------- rounds list */

const RoundsList = ({
  sections,
  onSelect,
  onEdit,
}: {
  sections: MbBracketSection[];
  onSelect?: (id: string) => void;
  onEdit?: (id: string) => void;
}) => (
  <div className="flex flex-col">
    {sections.map((section) =>
      section.rounds
        .filter((round) => round.cells.length > 0)
        .map((round) => (
          <div key={`${section.id}-${round.label}`}>
            <p
              className="mb-kicker border-b border-mb-rule bg-[var(--mb-band)] px-3 py-1.5 text-mb-navy"
              style={{ boxShadow: `inset 3px 0 0 ${ACCENT_VAR[section.accent]}` }}
            >
              {sections.length > 1 ? `${section.label} · ` : ""}
              {round.label}
            </p>
            <div className="flex flex-col divide-y divide-mb-rule">
              {round.cells.map((cell) => (
                <MbMatchRow
                  key={cell.id}
                  label={cell.label}
                  home={cell.home}
                  away={cell.away}
                  homeScore={cell.pending || cell.tbd ? undefined : cell.homeScore}
                  awayScore={cell.pending || cell.tbd ? undefined : cell.awayScore}
                  homeWon={cell.homeWon}
                  awayWon={cell.awayWon}
                  status={
                    cell.live ? "live" : cell.pending || cell.tbd ? "pending" : "completed"
                  }
                  variant={cell.pending ? "schedule" : "result"}
                  onSelect={
                    onSelect && !cell.tbd && !cell.bye
                      ? () => onSelect(cell.id)
                      : undefined
                  }
                  onEdit={
                    onEdit && cell.pending && !cell.tbd && !cell.bye
                      ? () => onEdit(cell.id)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))
    )}
  </div>
);

/* ------------------------------------------------------------------- rail */

const VIEW_OPTIONS = [
  { value: "list", label: "Rounds" },
  { value: "bracket", label: "Bracket" },
];

export const BracketRail = ({
  rounds,
  sections,
  variant = "single",
  champion,
  onSelect,
  onEdit,
  emptyMessage = "No bracket exists yet — start the competition to draw it.",
}: {
  /** The single-section case. Ignored when `sections` is given. */
  rounds?: MbBracketRound[];
  /** The multi-section case: winners / losers / grand finals in ONE scroller. */
  sections?: MbBracketSection[];
  variant?: "single" | "double";
  champion?: MbBracketChampion | null;
  onSelect?: (id: string) => void;
  onEdit?: (id: string) => void;
  emptyMessage?: string;
}) => {
  const blocks = useMemo<MbBracketSection[]>(() => {
    if (sections) return sections.filter((s) => s.rounds.some((r) => r.cells.length));
    return rounds && rounds.some((r) => r.cells.length)
      ? [{ id: "main", label: "Bracket", accent: "teal", rounds }]
      : [];
  }, [rounds, sections]);

  const layouts = useMemo(
    () => blocks.map((section) => layoutBracket(section.rounds)),
    [blocks]
  );

  const railRef = useRef<HTMLDivElement | null>(null);
  const [edge, setEdge] = useState({ start: false, end: false });
  const [view, setView] = useState<string>("list");

  const measureEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({ start: el.scrollLeft > 1, end: max > 1 && el.scrollLeft < max - 1 });
  }, []);

  /**
   * One scroll on mount, to the earliest round that still has something to
   * watch. `scrollLeft` is assigned directly — never `scrollIntoView`, which
   * walks every scrollable ancestor and would move the page (the exact defect
   * `Tabs.tsx` records) — and it is deliberately not smooth, so there is no
   * behaviour to clamp under `prefers-reduced-motion`.
   */
  const focusRound = useMemo(() => {
    for (const layout of layouts) {
      for (let r = 0; r < layout.columns.length; r += 1) {
        if (layout.columns[r].cells.some((c) => c.cell.live)) return r;
      }
    }
    for (const layout of layouts) {
      for (let r = 0; r < layout.columns.length; r += 1) {
        if (layout.columns[r].cells.some((c) => c.cell.pending && !c.cell.tbd)) return r;
      }
    }
    return 0;
  }, [layouts]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    if (focusRound > 0) {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollLeft = Math.min(focusRound * (MB_CELL_W + MB_COL_GAP), max);
    }
    measureEdges();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measureEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [focusRound, measureEdges]);

  if (blocks.length === 0) {
    return <PanelEmpty message={emptyMessage} />;
  }

  const rail = (
    <>
      <div
        ref={railRef}
        onScroll={measureEdges}
        className="min-w-0 overflow-x-auto px-4 pb-4 pt-3"
        style={{ scrollSnapType: "x proximity" }}
      >
        <div className="flex w-max flex-col gap-4">
          {blocks.map((section, i) => (
            <RailSection
              key={section.id}
              section={section}
              layout={layouts[i]}
              onSelect={onSelect}
              showLabel={variant === "double" || blocks.length > 1}
            />
          ))}
        </div>
      </div>

      {(edge.start || edge.end) && (
        <p className="mb-kicker flex items-center justify-center gap-1.5 border-t border-mb-rule py-1.5">
          {edge.start && <MbIcon id="chevron-left" size={10} className="shrink-0" />}
          More rounds
          {edge.end && <MbIcon id="chevron-right" size={10} className="shrink-0" />}
        </p>
      )}
    </>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {champion && <MbBracketChampionBlock champion={champion} />}

      {/* The choice exists only where both cuts are useful, so the control
          exists only there too (invariant 38 — this is redundant context above
          `sm`, not hidden information). */}
      <div className="border-b border-mb-rule px-4 py-2.5 sm:hidden">
        <MbSegmented
          name="bracket-view"
          value={view}
          onChange={setView}
          options={VIEW_OPTIONS}
          aria-label="Bracket display"
        />
      </div>

      <div className={view === "bracket" ? "" : "hidden sm:block"}>{rail}</div>
      <div className={view === "bracket" ? "hidden" : "sm:hidden"}>
        <RoundsList sections={blocks} onSelect={onSelect} onEdit={onEdit} />
      </div>
    </div>
  );
};
