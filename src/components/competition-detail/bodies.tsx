"use client";

import { useMemo, type ReactNode } from "react";
import type { MbTabItem } from "@/components/matchbook/Tabs";
import type { MbCompetitionDetail } from "@/components/matchbook/useMatchbookCompetitionDetail";
import type { Competition, Match, PersistentTeam } from "@/types/game";
import {
  BracketPanel,
  ChampionPanel,
  DangerPanel,
  DetailsPanel,
  EntrantsPanel,
  EventStatusPanel,
  LivePanel,
  PreviewPanel,
  ReadyPanel,
  ResultsPanel,
  SchedulePanel,
  SetupPanel,
  StandingsPanel,
} from "./panels";
import { FormatTabs, useFormatTabs } from "./tabs";

/* ===========================================================================
   THE FIVE BODIES

   One 12-column grid per format, spans drawn only from 7/5 and 12 (invariant
   4), and every region a `<Panel>` (invariant 5). Each body owns its own tab
   set because the views a format has are a property of the format, and each
   body is a `.mb-enter-grid` so its panels arrive in reading order.

   ------------------------------------------------------ two layout rules

   1. **No `items-start`.** All three grids used to set it, which none of the
      five shipped grids does, and it is what turned the right-hand column into
      bare paper: measured on `rr-live@1440`, 338 + 957 + 442 = **1,737px of
      2,443px, 71%** of the 473px column left blank. Every row now packs 7+5 or
      12, and a column that would otherwise be short carries a `flex flex-col
      gap-4` stack (design language §3.3) rather than a gap.

   2. **The live match leads.** `hasLiveScore` was FALSE on the default mobile
      view of a live round robin — the live match sat behind the Schedule tab
      and then a scroll, on a screen whose own panel printed "LIVE NOW 1". The
      live board is now pinned above the tab strip below `xl` (so it survives a
      tab change) and sits in the FIRST tab group at `xl`, where every panel is
      on screen at once. Exactly one of the two ever paints.

   On a COMPLETED competition there is no live board at all: the same cell
   carries the champion. That also settles rubric 7.3 — "No matches are live
   yet — start one and the score appears here" was a second equal-weight
   display headline offering an action that cannot be taken on a finished
   competition.
   =========================================================================== */

interface BodyProps {
  data: MbCompetitionDetail;
  competition: Competition;
  canEdit: boolean;
  onSelectMatch: (match: Match) => void;
  onEditMatch: (match: Match) => void;
}

/** The 12-column grid every body shares. Stretch, never `items-start`. */
const GRID = "mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12";

/**
 * The live board, pinned above the tab strip on a phone.
 *
 * `xl:hidden` here and `hidden xl:block` in the grid: complementary, so the
 * panel paints exactly once at every width. The same pattern `BracketRail`
 * already uses for its rail-versus-rounds-list pair.
 */
const PinnedLive = ({
  data,
  onSelectMatch,
}: Pick<BodyProps, "data" | "onSelectMatch">) =>
  data.liveLines.length === 0 ? null : (
    <div className="mb-4 xl:hidden">
      <LivePanel data={data} onSelect={onSelectMatch} />
    </div>
  );

/**
 * The same argument, one state later.
 *
 * A finished competition has exactly one headline — who won — and on a phone it
 * was below the standings table and off the first viewport, which is the same
 * inverted scanning path the live score had. It leads instead, and the grid
 * copy is `xl`-only so only one paints.
 */
const PinnedChampion = ({ data }: { data: MbCompetitionDetail }) => (
  <div className="mb-4 xl:hidden">
    <ChampionPanel data={data} />
  </div>
);

/* --------------------------------------------------------------- kickoff */

/**
 * Started, nothing played — the state between the Start dialog closing and the
 * first point of the first match.
 *
 * The five bodies below all assume a competition HAS results, or is a draft
 * that cannot. This one has neither: every readout they are built around reads
 * zero, and the three panels that would carry them (Standings, Live Now,
 * Results) have nothing but their own empty states to show. Measured on the
 * four-team round robin a first-time reader creates, the instant Start
 * completes: 35 printed zeros at 1440 and two equal-weight empty headlines
 * against a budget of one — a screen made of the shape of a competition with
 * the facts missing, which is the same defect the draft screen was cured of one
 * step earlier.
 *
 * So the same cure: a narrower composition rather than the wide one with the
 * numbers removed. Three panels, each with something true to say — what will
 * be played, what to play first, and the settings it will be played under —
 * and ONE control, the coral in `ReadyPanel`'s foot. Nothing is withheld that
 * the reader has seen: a competition this age has no history to lose, and the
 * tab strip does not appear because there are no longer three views to switch
 * between.
 *
 * It ends by itself. The moment the first match is live or finished
 * `data.unplayed` is false and the format's own body takes over, with the
 * standings, live board and results it now has data for.
 */
const ReadyBody = ({
  data,
  canEdit,
  principal,
}: {
  data: MbCompetitionDetail;
  canEdit: boolean;
  /**
   * The 7-column object this format leads with before anything is played: the
   * fixture list for a league, the DRAW for a bracket. A bracket's opening
   * round is real information at this point — seeded pairings a reader can
   * check against the entry order — which is why it is passed in rather than
   * assumed.
   */
  principal: ReactNode;
}) => (
  <>
    {/* The commit leads on a phone and sits in the 5-column stack at `xl` —
        the same complementary pair `PinnedLive`/`HeadlinePanel` uses, so
        exactly one copy paints at every width. */}
    <div className="mb-4 xl:hidden">
      <ReadyPanel data={data} canEdit={canEdit} />
    </div>
    <div className={GRID}>
      <div className="xl:col-span-7">{principal}</div>
      <div className="flex flex-col gap-4 xl:col-span-5">
        <div className="hidden xl:block">
          <ReadyPanel data={data} canEdit={canEdit} />
        </div>
        <DetailsPanel data={data} createdDate={data.createdDate} />
      </div>
    </div>
  </>
);

/** The `xl`-only copy of whichever headline this state has. */
const HeadlinePanel = ({
  done,
  data,
  onSelectMatch,
}: {
  done: boolean;
  data: MbCompetitionDetail;
  onSelectMatch: (match: Match) => void;
}) => (
  <div className="hidden xl:block">
    {done ? (
      <ChampionPanel data={data} />
    ) : (
      <LivePanel data={data} onSelect={onSelectMatch} />
    )}
  </div>
);

/* -------------------------------------------------------------- round robin */

export const RoundRobinBody = ({
  data,
  competition,
  canEdit,
  onSelectMatch,
  onEditMatch,
}: BodyProps) => {
  const items = useMemo<MbTabItem[]>(
    () => [
      { value: "standings", label: "Standings", icon: "chart" },
      {
        value: "schedule",
        label: "Schedule",
        icon: "calendar",
        count: data.counts.pending + data.counts.live,
      },
      {
        value: "results",
        label: "Results",
        icon: "history",
        count: data.resultLines.length,
      },
    ],
    [data.counts.pending, data.counts.live, data.resultLines.length]
  );
  const tabs = useFormatTabs(items);
  const done = competition.status === "completed";

  /* Started with nothing played is its own state, not this one with the
     numbers at zero. The hooks above still run — the window closes on the
     first score and this body resumes. */
  if (data.unplayed) {
    return (
      <ReadyBody
        data={data}
        canEdit={canEdit}
        principal={
          <SchedulePanel
            data={data}
            canEdit={canEdit}
            onSelect={onSelectMatch}
            onEdit={onEditMatch}
          />
        }
      />
    );
  }

  return (
    <>
      {done ? (
        <PinnedChampion data={data} />
      ) : (
        <PinnedLive data={data} onSelectMatch={onSelectMatch} />
      )}

      <FormatTabs
        items={items}
        value={tabs.value}
        onValueChange={tabs.setValue}
        label="Competition views"
      />
      <div className={GRID}>
        <div className={`xl:col-span-7 ${tabs.groupClass("standings")}`}>
          <StandingsPanel data={data} competitionName={competition.name} />
        </div>
        {/* The short column, stacked rather than stretched: the standings
            table is ~460px tall and neither of these two fills it alone. */}
        <div
          className={`flex flex-col gap-4 xl:col-span-5 ${tabs.groupClass("standings")}`}
        >
          <HeadlinePanel done={done} data={data} onSelectMatch={onSelectMatch} />
          <EventStatusPanel data={data} status={competition.status} />
        </div>
        <div className={`xl:col-span-7 ${tabs.groupClass("schedule")}`}>
          <SchedulePanel
            data={data}
            canEdit={canEdit}
            onSelect={onSelectMatch}
            onEdit={onEditMatch}
          />
        </div>
        {/* The configuration the schedule was generated FROM — points per win,
            venues, the match format — beside the schedule itself. */}
        <div className={`xl:col-span-5 ${tabs.groupClass("schedule")}`}>
          <DetailsPanel data={data} createdDate={data.createdDate} />
        </div>
        <div className={`xl:col-span-12 ${tabs.groupClass("results")}`}>
          <ResultsPanel lines={data.resultLines} onSelect={onSelectMatch} />
        </div>
      </div>
    </>
  );
};

/* ------------------------------------------------------------------ bracket */

export const BracketBody = ({
  data,
  competition,
  canEdit,
  onSelectMatch,
  onEditMatch,
  matches,
}: BodyProps & { matches: Match[] }) => {
  const items = useMemo<MbTabItem[]>(
    () => [
      { value: "bracket", label: "Bracket", icon: "bracket" },
      {
        value: "schedule",
        label: "Schedule",
        icon: "calendar",
        count: data.counts.pending + data.counts.live,
      },
      {
        value: "results",
        label: "Results",
        icon: "history",
        count: data.resultLines.length,
      },
    ],
    [data.counts.pending, data.counts.live, data.resultLines.length]
  );
  const tabs = useFormatTabs(items);
  const done = competition.status === "completed";

  const byId = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const dispatch = (handler: (match: Match) => void) => (id: string) => {
    const match = byId.get(id);
    if (match) handler(match);
  };

  /* Same window, same cure — a bracket whose opening round has not been played
     is a draw of TBDs beside a table of nothing. See `ReadyBody`. */
  if (data.unplayed) {
    return (
      <ReadyBody
        data={data}
        canEdit={canEdit}
        principal={
          <BracketPanel
            data={data}
            canEdit={canEdit}
            onSelect={dispatch(onSelectMatch)}
            onEdit={dispatch(onEditMatch)}
          />
        }
      />
    );
  }

  return (
    <>
      {done ? (
        <PinnedChampion data={data} />
      ) : (
        <PinnedLive data={data} onSelectMatch={onSelectMatch} />
      )}

      <FormatTabs
        items={items}
        value={tabs.value}
        onValueChange={tabs.setValue}
        label="Competition views"
      />
      <div className={GRID}>
        {/* 7, not 12. The rail is a FIXED-geometry object — an 8-team bracket
            is 3 columns of 156px plus two 40px gutters = 548px — so a 12-wide
            panel left 780px of the frame as bare paper at 1440 with nothing
            able to fill it. At 7 (≈890px) an 8-team bracket sits comfortably
            and a 16-team one (744px) still fits; anything wider scrolls, which
            is what the rail's own edge affordance is for. */}
        <div className={`xl:col-span-7 ${tabs.groupClass("bracket")}`}>
          <BracketPanel
            data={data}
            canEdit={canEdit}
            onSelect={dispatch(onSelectMatch)}
            onEdit={dispatch(onEditMatch)}
          />
        </div>
        <div
          className={`flex flex-col gap-4 xl:col-span-5 ${tabs.groupClass("bracket")}`}
        >
          <HeadlinePanel done={done} data={data} onSelectMatch={onSelectMatch} />
          <EventStatusPanel data={data} status={competition.status} />
        </div>
        <div className={`xl:col-span-7 ${tabs.groupClass("schedule")}`}>
          <SchedulePanel
            data={data}
            canEdit={canEdit}
            onSelect={onSelectMatch}
            onEdit={onEditMatch}
          />
        </div>
        <div className={`xl:col-span-5 ${tabs.groupClass("schedule")}`}>
          <DetailsPanel data={data} createdDate={data.createdDate} />
        </div>
        <div className={`xl:col-span-12 ${tabs.groupClass("results")}`}>
          <ResultsPanel lines={data.resultLines} onSelect={onSelectMatch} />
        </div>
      </div>
    </>
  );
};

/* -------------------------------------------------------------------- draft */

/**
 * The setup console.
 *
 * Draft was the emptiest screen in the app: a masthead, a 6-tile read-only team
 * list and 2,000px of paper. You could not add or remove a team, see the
 * format's settings, preview what Start would generate, or delete the
 * competition — even though all of those are competition fields (brief §2.5).
 * All four are here.
 */
export const DraftBody = ({
  data,
  competition,
  canEdit,
  teams,
  deleting,
  onAddTeams,
  onRemoveTeam,
  onStart,
  onDelete,
}: {
  data: MbCompetitionDetail;
  competition: Competition;
  canEdit: boolean;
  teams: PersistentTeam[];
  deleting?: boolean;
  onAddTeams: () => void;
  onRemoveTeam: (teamId: string) => void;
  onStart: () => void;
  onDelete: () => void;
}) => {
  const canStart = teams.length >= 2 && data.draft.summary.length > 0;
  return (
    <div className={GRID}>
      {/* WHAT START WILL BUILD LEADS, at every width.
          It was `order-1` below `xl` and DOM-third above it, so on a phone the
          reader met the preview and its coral commit first and on a desktop met
          the roster first, with the screen's only Start 935px down a 974px page
          — below the fold at 900. Since the masthead's duplicate Start is gone
          (see `competitions/[id]/page.tsx`) that button is the whole screen, so
          it leads everywhere. Measured after, on a four-team round robin and an
          eight-team bracket draft:

            390x844   289 / 427   (was 337 / 475, under a second Start at 159)
            1440x900  197 / 324   (was 889 / 935, i.e. off the first screen)

          — inside the first viewport at both widths and both formats, with no
          sticky element and no overlay. A viewer has no danger zone, so the
          preview takes the whole row rather than leaving 5 columns of paper
          beside it. */}
      <div className={canEdit ? "xl:col-span-7" : "xl:col-span-12"}>
        <PreviewPanel
          data={data}
          canEdit={canEdit}
          canStart={canStart}
          onStart={onStart}
        />
      </div>
      {/* Setup alone, not Setup + Event Details. Both panels print
          `data.configLines`; rendering the pair put FORMAT / TEAMS ENTERED /
          MATCH FORMAT / POINTS / VENUE WORD on the screen twice, in caps and
          then in sentence case, with the same icons — see `SetupPanel`, which
          now carries the one fact only Event Details had. */}
      <div className="xl:col-span-5">
        <SetupPanel data={data} createdDate={data.createdDate} />
      </div>
      <div className="xl:col-span-7">
        <EntrantsPanel
          teams={teams}
          canEdit={canEdit}
          onAdd={onAddTeams}
          onRemove={onRemoveTeam}
          refFor={data.refFor}
        />
      </div>
      {canEdit && (
        <div className="xl:col-span-5">
          <DangerPanel
            name={competition.name}
            loading={deleting}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
};
