"use client";

import Link from "next/link";
import { TeamMark } from "./Panel";
import { MbBadge } from "./Badge";
import { MbFinalStamp } from "./FinalStamp";
import { MbScoreNumeral, type MbScoreNumeralSize } from "./ScoreNumeral";
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

interface Notch {
  className: string;
  style: React.CSSProperties | undefined;
}

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
 * Both numerals carry the top padding whether or not they carry the lead rule,
 * so a lead change repaints a shadow and moves nothing (invariant 43).
 */
const ScoreCell = ({
  value,
  size,
  notch,
}: {
  value: number;
  size: MbScoreNumeralSize;
  notch: Notch;
}) => (
  <span className={`flex items-center pt-2 ${notch.className}`} style={notch.style}>
    <MbScoreNumeral value={value} size={size} />
  </span>
);

/** One team row of the stacked mobile scoreline: identity left, score right. */
const HeroRow = ({
  team,
  accent,
  wins,
  of,
  score,
  notch,
  divided,
}: {
  team: MbTeam;
  accent?: string;
  wins: number;
  of: number;
  score: number | null;
  notch: Notch;
  divided: boolean;
}) => (
  <div
    className={`grid items-center gap-3 ${
      score === null ? "grid-cols-1" : "grid-cols-[1fr_auto]"
    } ${divided ? "mt-3 border-t border-mb-rule pt-3" : ""}`}
  >
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      <TeamMark team={team} size="md" accent={accent} className="w-full" />
      {of > 0 && <SeriesPips wins={wins} of={of} />}
    </div>
    {score !== null && <ScoreCell value={score} size="console" notch={notch} />}
  </div>
);

/**
 * The matchup block: two identities, one score, one status.
 *
 * At `sm` and above the layout is `.mb-scoreline` — CSS grid `1fr auto 1fr`
 * with `min-width: 0` on every cell — and never flex. That is the point of the
 * component: a 40-character team name truncates inside its own column instead
 * of pushing the score off centre, and only a grid whose middle track is `auto`
 * keeps the numerals optically centred however the two names differ in length.
 *
 * Below `sm` the same three cells cannot hold a 60px numeral *and* a readable
 * name — at 390px each 1fr column is about 60px, which turns "Harbor Surge"
 * into "Har…" and destroys the identity the block exists to show. So the hero
 * reflows to one row per team, identity left and score right, which is the
 * shape every phone scoreboard uses and keeps the numeral at its full step
 * (public-share R5 wants ≥40px on mobile). `compact` needs no reflow: its
 * numeral is 30px and the three cells fit.
 *
 * A `pending` match reads "vs" rather than `0–0`. The API carries scores for
 * every status, but printing 0–0 on a fixture that has not started asserts a
 * result that does not exist — the numbers are accepted and simply not shown.
 *
 * The leading side takes a 3px rule above its numeral: coral while `live` (the
 * console's `.mb-notch-coral` vocabulary) and navy once `final`. It is a second
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

  const notchFor = (leads: boolean): Notch => {
    if (!leads) return { className: "", style: undefined };
    if (status === "live") return { className: "mb-notch-coral", style: undefined };
    return { className: "", style: { boxShadow: "inset 0 3px 0 var(--mb-navy)" } };
  };
  const homeNotch = notchFor(scored && homeScore > awayScore);
  const awayNotch = notchFor(scored && awayScore > homeScore);
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

  /** The `1fr auto 1fr` scoreline: hero at ≥sm, and compact at every width. */
  const scoreline = (
    <div className={`mb-scoreline ${hero ? "px-4 pb-5 pt-3 sm:px-6" : "px-3 py-3"}`}>
      <div className="flex min-w-0 flex-col items-center gap-2">
        {hero ? (
          <TeamMark
            team={home}
            size="lg"
            orientation="vertical"
            accent={homeAccent}
            className="w-full"
          />
        ) : (
          <TeamMark team={home} size="sm" accent={homeAccent} className="w-full" />
        )}
        {hero && of > 0 && <SeriesPips wins={homeWins} of={of} />}
      </div>

      {scored ? (
        <div className="flex items-stretch justify-center gap-2 sm:gap-3">
          <ScoreCell value={homeScore} size={numeral} notch={homeNotch} />
          <span className="mb-rule-vertical" />
          <ScoreCell value={awayScore} size={numeral} notch={awayNotch} />
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
            className="w-full"
          />
        ) : (
          <TeamMark team={away} size="sm" accent={awayAccent} reverse className="w-full" />
        )}
        {hero && of > 0 && <SeriesPips wins={awayWins} of={of} />}
      </div>
    </div>
  );

  const stacked = (
    <div className="px-4 pb-4 pt-3">
      <HeroRow
        team={home}
        accent={homeAccent}
        wins={homeWins}
        of={of}
        score={scored ? homeScore : null}
        notch={homeNotch}
        divided={false}
      />
      {!scored && (
        <div className="my-2 flex items-center gap-3">
          <span className="h-px flex-1 bg-mb-rule" />
          {versus}
          <span className="h-px flex-1 bg-mb-rule" />
        </div>
      )}
      <HeroRow
        team={away}
        accent={awayAccent}
        wins={awayWins}
        of={of}
        score={scored ? awayScore : null}
        notch={awayNotch}
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

      {/* `.mb-scoreline` sets `display:grid` from an unlayered rule, so the
          breakpoint switch lives on a wrapper rather than on the grid itself. */}
      <div aria-hidden="true" className={hero ? "hidden sm:block" : "block"}>
        {scoreline}
      </div>
      {hero && (
        <div aria-hidden="true" className="sm:hidden">
          {stacked}
        </div>
      )}

      {/* One readout for the whole block: the visual half is aria-hidden, so
          nothing above is announced twice and the scores are never silent. */}
      <span className="sr-only">{summary}</span>
    </>
  );

  const shell = `mb-tile block w-full overflow-hidden rounded-[4px] text-left ${
    hero ? "shadow-[var(--mb-panel-shadow)]" : ""
  } ${onSelect || href ? "mb-row-hover" : ""} ${className}`;
  /* Inline, not `border-t-4`: `.mb-tile` sets the `border` shorthand from an
     unlayered rule, which outranks every Tailwind border utility. */
  const shellStyle = hero ? { borderTopWidth: 4 } : undefined;

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={shell} style={shellStyle}>
        {body}
      </button>
    );
  }
  if (href) {
    return (
      <Link href={href} className={shell} style={shellStyle}>
        {body}
      </Link>
    );
  }
  return (
    <div className={shell} style={shellStyle}>
      {body}
    </div>
  );
};
