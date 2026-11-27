"use client";

import { BracketTile } from "@/components/shared/BracketTile";
import { Card, CardEmpty } from "@/components/shared/Card";
import { Icon } from "@/components/shared/Icon";
import { isCorrectable, type BracketView, type ConsoleAccess } from "@/lib/console";
import { matchLine } from "@/lib/scoreLine";
import type { Match, Tournament } from "@/types/game";
import { scoringLink } from "./MatchRow";
import type { TeamLookup } from "./teamRefs";
import { LABEL } from "@/components/shared/classes";

/** What a tile that opens the correction of its result says at its foot. */
const CORRECT = (
  <>
    <span className="font-semibold text-ink">Correct</span>
    <Icon id="chevron-right" size={12} />
  </>
);

/**
 * The Bracket tab: each round as a column of bracket tiles, spread to line
 * up with the round before. A pending or live match opens scoring for an
 * owner or scorer. With `onCorrect`, a completed match opens the correction
 * of its result and says so at its foot. A bye or a forfeit has no score to
 * correct and stays as it is.
 */
export const BracketPanel = ({
  tournament,
  view,
  team,
  access,
  onCorrect,
}: {
  tournament: Tournament;
  view: BracketView;
  team: TeamLookup;
  access: ConsoleAccess;
  /** Offered when completed results can be corrected: the owner of a live bracket. */
  onCorrect?: (match: Match) => void;
}) => {
  const drawn = view.sections.some((section) =>
    section.rounds.some((round) => round.matches.length > 0),
  );
  return (
    <Card title="Bracket">
      {tournament.status === "draft" || !drawn ? (
        <CardEmpty message="The bracket is drawn when the tournament starts." />
      ) : (
        <div className="flex flex-col divide-y divide-line">
          {view.sections.map((section) => (
            <div key={section.title ?? "bracket"} className="p-4">
              {section.title && <p className="mb-2 text-label font-bold">{section.title}</p>}
              {section.rounds.length === 0 ? (
                <p className="text-label text-ink-soft">Not drawn yet.</p>
              ) : (
                // The rounds scroll out to the card's two edges, past the section's padding.
                <div className="-mx-4 flex items-stretch gap-5 overflow-x-auto px-4 pb-2">
                  {section.rounds.map((round) => (
                    <div key={round.label} className="flex flex-col gap-3">
                      <p className={LABEL}>{round.label}</p>
                      <div className="flex flex-1 flex-col justify-around gap-3">
                        {round.matches.map((match) => {
                          const correctable = onCorrect && isCorrectable(tournament, match);
                          return (
                            <BracketTile
                              key={match.id}
                              home={match.homeTeamId ? team(match.homeTeamId) : null}
                              away={match.awayTeamId ? team(match.awayTeamId) : null}
                              {...matchLine(match)}
                              href={scoringLink(match, access)}
                              onClick={correctable ? () => onCorrect(match) : undefined}
                              action={correctable ? CORRECT : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
