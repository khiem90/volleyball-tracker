"use client";

import Link from "next/link";
import { TeamMark } from "./Panel";
import { MbBadge } from "./Badge";
import { MbFinalStamp } from "./FinalStamp";
import {
  MbScoreNumeral,
  type MbScoreNumeralAlign,
  type MbScoreNumeralSize,
} from "./ScoreNumeral";
import type { MbTeam } from "./types";

export type MbScoreboardStatus = "live" | "final" | "pending";
export type MbScoreboardSize = "hero" | "compact";

export interface MbScoreboardSeries {
  /** 1-based. Clamped to `of` here so "Game 4 of 3" cannot render. */
  game: number;
  of: number;
  homeWins: number;
  awayWins: number;
}

/** The ink of the lead rule, or `null` for the side that is not leading. */
type Lead = string | null;

const CELL_ALIGN: Record<MbScoreNumeralAlign, string> = {
  center: "items-center",
  start: "items-start",
  end: "items-end",
};

/**
 * Series games won, as filled squares. Reuses `.mb-form-square`, so the wins
 * read in the same vocabulary as a form strip, and the count survives greyscale
 * because it is carried by fill *presence*, not hue.
 */
const SeriesPips = ({ wins, of }: { wins: number; of: number }) => (
  <span className="inline-flex shrink-0 items-center gap-[3px]">
    {Array.from({ length: Math.max(0, of) }, (_, i) => (
      <span
        key={i}
        className="mb-form-square"
        style={{ background: i < wins ? "var(--mb-navy)" : "var(--mb-tint-3)" }}
      />
    ))}
  </span>
);

/**
 * Both numerals carry the 3px rule slot whether or not they are leading — the
 * losing side draws it in `transparent` — so a lead change repaints one colour
 * and moves nothing (invariant 43).
 *
 * The rule is as wide as the figures, not as wide as the box. The box is a
 * three-figure reserve at every step, so it measures the same at 0 and at 108
 * and nothing beside it moves when the score changes; but the figures hug the
 * divider, which leaves that reserve open on the outside, and a rule cut to the
 * box would hang over blank paper — 49.5px of navy over a 16.5px "9" at the
 * compact step. `.mb-score-rule` reads the figure count off `--mb-figures`.
 */
const ScoreCell = ({
  value,
  size,
  align,
  lead,
}: {
  value: number;
  size: MbScoreNumeralSize;
  align: MbScoreNumeralAlign;
  lead: Lead;
}) => (
  <span className={`flex flex-col gap-[5px] ${CELL_ALIGN[align]}`}>
    <span
      aria-hidden="true"
      className={`mb-score-rule mb-numeral--${size}`}
      style={
        {
          "--mb-figures": String(value).length,
          "--mb-score-ink": lead ?? "transparent",
        } as React.CSSProperties
      }
    />
    <MbScoreNumeral value={value} size={size} align={align} />
  </span>
);

/**
 * One team block of the narrow cut: identity above or beside its own score.
 *
 * `.mb-sb-row` is `1fr auto` while the container can afford it and `1fr` below
 * that, where the score simply falls to a second line and the name takes the
 * whole width. Both scores are `end`-aligned, so the two sit in one right-hand
 * column and read as a pair down the card.
 */
const ScoreboardRow = ({
  team,
  accent,
  markSize,
  numeral,
  wins,
  of,
  score,
  lead,
  divided,
}: {
  team: MbTeam;
  accent?: string;
  markSize: "sm" | "md";
  numeral: MbScoreNumeralSize;
  wins: number;
  of: number;
  score: number | null;
  lead: Lead;
  divided: boolean;
}) => (
  <div className={`mb-sb-row ${divided ? "mt-3 border-t border-mb-rule pt-3" : ""}`}>
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      <TeamMark team={team} size={markSize} accent={accent} wrap className="w-full" />
      {of > 0 && <SeriesPips wins={wins} of={of} />}
    </div>
    {score !== null && (
      <span className="justify-self-end">
        <ScoreCell value={score} size={numeral} align="end" lead={lead} />
      </span>
    )}
  </div>
);

/**
 * The matchup block: two identities, one score, one status.
 *
 * **Why there are two cuts, and why the container picks between them.** The
 * score box is a fixed three-figure reserve — that is what stops the layout
 * reflowing when a point lands — and in a `1fr auto 1fr` scoreline the two name
 * columns pay for the whole of it, twice over. At the hero step the reserve is
 * 223.5px of track; every pixel of it comes out of the names. Measured before
 * this component chose its own cut: at 1440px the compact card's name column
 * was 155.33px and dropped 16 characters of a 40-character name, and at 320px
 * it was 1.00px — every name rendered as a bare ellipsis and the scoreline read
 * "… 7 | 9 …". A viewport media query could not have caught the 1440px case,
 * because the same card is 771px wide in one panel and 537px in the next on
 * that screen. `.mb-scoreboard` is therefore an inline-size container and the
 * cut is chosen from the card, in `globals.css`, with the arithmetic written
 * out beside the thresholds.
 *
 * Above the threshold: `.mb-scoreline`, grid `1fr auto 1fr` with `min-width: 0`
 * on every cell — never flex — so the numerals hold the centre however the two
 * names differ in length. Below it: one block per team, identity left and score
 * right, which is the shape every phone scoreboard uses and which charges the
 * reserve once instead of twice.
 *
 * **Names wrap, they do not truncate.** The rubric's own reference anchor is
 * Apple Sports surviving Dynamic Type by wrapping rather than truncating, and
 * an ellipsis is a worse failure than a second line: "Northwest Kalamazoo
 * Thunderhawks Academy" and "Northside Community Volleyball Association" are
 * the same three characters once truncated. Every threshold above is set at the
 * width where a 40-character name still sets in two lines.
 *
 * A `pending` match reads "vs" rather than `0–0`. The API carries scores for
 * every status, but printing 0–0 on a fixture that has not started asserts a
 * result that does not exist — the numbers are accepted and simply not shown.
 *
 * The leading side takes a 3px rule above its figures: coral while `live` — the
 * console's `.mb-notch-coral` ink — and navy once `final`. It is a second
 * channel for a fact the scores already state, so nothing depends on it.
 */
export const MbScoreboardHero = ({
  home,
  away,
  homeScore,
  awayScore,
  homeAccent,
  awayAccent,
  series,
  status,
  size = "hero",
  href,
  onSelect,
  className = "",
}: {
  home: MbTeam;
  away: MbTeam;
  homeScore: number;
  awayScore: number;
  /** Team colour as a contained bar only — never a fill (charter D-9). */
  homeAccent?: string;
  awayAccent?: string;
  series?: MbScoreboardSeries;
  status: MbScoreboardStatus;
  size?: MbScoreboardSize;
  href?: string;
  /** Takes precedence over `href`, matching `PanelEmpty`'s onAction rule. */
  onSelect?: () => void;
  className?: string;
}) => {
  const hero = size === "hero";
  const scored = status !== "pending";
  const of = series ? Math.max(1, Math.round(series.of)) : 0;
  const game = series ? Math.min(Math.max(1, Math.round(series.game)), of) : 0;
  const homeWins = series?.homeWins ?? 0;
  const awayWins = series?.awayWins ?? 0;

  const leadFor = (leads: boolean): Lead =>
    !leads ? null : status === "live" ? "var(--mb-coral)" : "var(--mb-navy)";
  const homeLead = leadFor(scored && homeScore > awayScore);
  const awayLead = leadFor(scored && awayScore > homeScore);
  const numeral: MbScoreNumeralSize = hero ? "console" : "compact";

  const statusWord = status === "live" ? "Live" : status === "final" ? "Final" : "Upcoming";
  const seriesSentence = series
    ? ` Game ${game} of ${of}, series ${homeWins} to ${awayWins}.`
    : "";
  const summary = scored
    ? `${statusWord}. ${home.name} ${homeScore}, ${away.name} ${awayScore}.${seriesSentence}`
    : `${statusWord}. ${home.name} versus ${away.name}.${seriesSentence}`;

  const versus = (
    <span className="matchbook-display px-1 text-[0.74rem] font-bold tracking-[0.1em] text-mb-ink-muted">
      vs
    </span>
  );

  /** The `1fr auto 1fr` cut, taken once the card is wide enough to afford it. */
  const scoreline = (
    <div className={`mb-scoreline ${hero ? "px-6 pb-5 pt-3" : "px-3 py-3"}`}>
      <div className="flex min-w-0 flex-col items-center gap-2">
        {hero ? (
          <TeamMark
            team={home}
            size="lg"
            orientation="vertical"
            accent={homeAccent}
            wrap
            className="w-full"
          />
        ) : (
          <TeamMark team={home} size="sm" accent={homeAccent} wrap className="w-full" />
        )}
        {hero && of > 0 && <SeriesPips wins={homeWins} of={of} />}
      </div>

      {scored ? (
        /* `end` then `start`: the reserve opens away from the rule, so both
           scores hug the divider and the pair stays a pair at 7–108. */
        <div className={`flex items-stretch justify-center ${hero ? "gap-3" : "gap-2"}`}>
          <ScoreCell value={homeScore} size={numeral} align="end" lead={homeLead} />
          <span className="mb-rule-vertical" />
          <ScoreCell value={awayScore} size={numeral} align="start" lead={awayLead} />
        </div>
      ) : (
        versus
      )}

      {/* `reverse` flips the main axis, so the away mark already sits at the
          right edge — `justify-end` would push it back to the left. */}
      <div className="flex min-w-0 flex-col items-center gap-2">
        {hero ? (
          <TeamMark
            team={away}
            size="lg"
            orientation="vertical"
            accent={awayAccent}
            wrap
            className="w-full"
          />
        ) : (
          <TeamMark team={away} size="sm" accent={awayAccent} reverse wrap className="w-full" />
        )}
        {hero && of > 0 && <SeriesPips wins={awayWins} of={of} />}
      </div>
    </div>
  );

  /** The narrow cut: one block per team, at the same numeral step. */
  const stacked = (
    <div className={hero ? "px-4 pb-4 pt-3" : "px-3 py-3"}>
      <ScoreboardRow
        team={home}
        accent={homeAccent}
        markSize={hero ? "md" : "sm"}
        numeral={numeral}
        wins={homeWins}
        of={of}
        score={scored ? homeScore : null}
        lead={homeLead}
        divided={false}
      />
      {!scored && (
        <div className="my-2 flex items-center gap-3">
          <span className="h-px flex-1 bg-mb-rule" />
          {versus}
          <span className="h-px flex-1 bg-mb-rule" />
        </div>
      )}
      <ScoreboardRow
        team={away}
        accent={awayAccent}
        markSize={hero ? "md" : "sm"}
        numeral={numeral}
        wins={awayWins}
        of={of}
        score={scored ? awayScore : null}
        lead={awayLead}
        divided={scored}
      />
    </div>
  );

  const body = (
    <>
      <div
        aria-hidden="true"
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-mb-rule px-4 py-2.5"
      >
        {status === "final" ? (
          <MbFinalStamp rotate={hero ? -6 : 0} />
        ) : status === "live" ? (
          <MbBadge tone="live" variant="framed" size={hero ? "md" : "sm"}>
            Live
          </MbBadge>
        ) : (
          <MbBadge tone="neutral" size={hero ? "md" : "sm"}>
            Upcoming
          </MbBadge>
        )}

        {series && (
          <span className="mb-kicker truncate tabular-nums">
            Game {game} of {of}
            {!hero && ` · ${homeWins}–${awayWins}`}
          </span>
        )}
      </div>

      {/* Both cuts are always in the DOM; `globals.css` shows exactly one from
          the container query. `.mb-scoreline` sets `display:grid` from an
          unlayered rule, so the switch lives on the wrapper, not on the grid. */}
      <div aria-hidden="true" className="mb-sb-wide">
        {scoreline}
      </div>
      <div aria-hidden="true" className="mb-sb-narrow">
        {stacked}
      </div>

      {/* One readout for the whole block: the visual half is aria-hidden, so
          nothing above is announced twice and the scores are never silent. */}
      <span className="sr-only">{summary}</span>
    </>
  );

  const shell = `mb-scoreboard mb-tile block w-full overflow-hidden rounded-[4px] text-left ${
    hero ? "shadow-[var(--mb-panel-shadow)]" : ""
  } ${onSelect || href ? "mb-row-hover" : ""} ${className}`;
  /* Inline, not `border-t-4`: `.mb-tile` sets the `border` shorthand from an
     unlayered rule, which outranks every Tailwind border utility. */
  const shellStyle = hero ? { borderTopWidth: 4 } : undefined;

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        data-size={size}
        className={shell}
        style={shellStyle}
      >
        {body}
      </button>
    );
  }
  if (href) {
    return (
      <Link href={href} data-size={size} className={shell} style={shellStyle}>
        {body}
      </Link>
    );
  }
  return (
    <div data-size={size} className={shell} style={shellStyle}>
      {body}
    </div>
  );
};
