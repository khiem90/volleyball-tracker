"use client";

import { useMemo } from "react";
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
  <>
  <div className={GRID}>
    {/* `order-2` below `xl`. On a phone the draft console leads with WHAT START
        WILL BUILD — the panel the screen exists for, and the one carrying the
        commit — then the roster it was built from, then the configuration,
        then delete. Measured: the coral Start moves from **2.44x viewport
        height** (2,056px down a 390px page, rubric 6.5 wants the bottom third)
        to ~0.8x, with no sticky element and no overlay. The desktop grid needs
        the DOM order it has (7+5, 7+5), so every override stops at `xl`. */}
    <div className="order-2 xl:order-none xl:col-span-7">
      <EntrantsPanel
        teams={teams}
        canEdit={canEdit}
        onAdd={onAddTeams}
        onRemove={onRemoveTeam}
        refFor={data.refFor}
      />
    </div>
    {/* Setup and the details readout stack beside the entrants list rather than
        leaving the column short under it. */}
    <div className="order-3 flex flex-col gap-4 xl:order-none xl:col-span-5">
      <SetupPanel data={data} />
      <DetailsPanel data={data} createdDate={data.createdDate} />
    </div>
    {/* A viewer has no danger zone, so the preview takes the whole row rather
        than leaving 5 columns of paper beside it. */}
    <div
      className={`order-1 xl:order-none ${canEdit ? "xl:col-span-7" : "xl:col-span-12"}`}
    >
      <PreviewPanel
        data={data}
        canEdit={canEdit}
        canStart={canStart}
        onStart={onStart}
      />
    </div>
    {canEdit && (
      <div className="order-4 xl:order-none xl:col-span-5">
        <DangerPanel
          name={competition.name}
          loading={deleting}
          onDelete={onDelete}
        />
      </div>
    )}
  </div>

  {/* The commit bar, phone only.
      A draft competition is a setup screen whose whole purpose is one
      irreversible commit, which is what `MbActionBar` is for (charter
      Appendix B: the wizard's footer and the scoring rail are both this
      component). Measured before it: the only coral Start on
      `competition-de-draft@390` sat at **2.44x viewport height** — 2,056px
      down a 390px-wide page — against rubric 6.5's bottom third. With the bar
      it is pinned in the thumb zone at every scroll position.

      `bottom-[var(--mb-toast-offset,0px)]!` is `competitions/new/page.tsx`'s
      own idiom, not a new one: that variable is `MatchbookBottomBar`'s
      published height, so the commit bar rides above the fixed tab bar
      without restating either media query, and the `!` is required because
      `.mb-action-bar { bottom: 0 }` is unlayered.

      At `xl` the bar is hidden and `PreviewPanel`'s own footer carries the
      commit, so exactly ONE coral Start renders at every width. */}
  </>
  );
};
