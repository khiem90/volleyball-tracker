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

/* The five per-format bodies. One 12-column grid each, spans only 7/5 or 12,
   every region a <Panel>. Two layout rules:
   1. No `items-start` — a short column carries a `flex flex-col gap-4` stack
      instead of stretching a lone panel into bare paper.
   2. The live match leads: pinned above the tab strip below `xl`, in the
      first tab group at `xl`; exactly one of the two ever paints. On a
      completed competition the same cell carries the champion instead. */

interface BodyProps {
  data: MbCompetitionDetail;
  competition: Competition;
  canEdit: boolean;
  onSelectMatch: (match: Match) => void;
  onEditMatch: (match: Match) => void;
}

/** The 12-column grid every body shares. Stretch, never `items-start`. */
const GRID = "mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12";

/* The live board, pinned above the tab strip on a phone. `xl:hidden` here and
   `hidden xl:block` in the grid are complementary — one paint per width. */
const PinnedLive = ({
  data,
  onSelectMatch,
}: Pick<BodyProps, "data" | "onSelectMatch">) =>
  data.liveLines.length === 0 ? null : (
    <div className="mb-4 xl:hidden">
      <LivePanel data={data} onSelect={onSelectMatch} />
    </div>
  );

/* Same pinning for the finished competition's one headline: who won. */
const PinnedChampion = ({ data }: { data: MbCompetitionDetail }) => (
  <div className="mb-4 xl:hidden">
    <ChampionPanel data={data} />
  </div>
);

/* --------------------------------------------------------------- kickoff */

/**
 * Started, nothing played — the state between the Start dialog closing and
 * the first point. A narrower composition (three panels, one control) instead
 * of the full body with every readout at zero. Ends by itself: the first live
 * or finished match flips `data.unplayed` and the format's body takes over.
 */
const ReadyBody = ({
  data,
  canEdit,
  principal,
}: {
  data: MbCompetitionDetail;
  canEdit: boolean;
  /** The 7-column lead object: the fixture list for a league, the draw for a
   *  bracket. */
  principal: ReactNode;
}) => (
  <>
    {/* The commit leads on a phone; the `xl` copy sits in the 5-column stack —
        exactly one paints at every width. */}
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

  /* Started-with-nothing-played is its own state. The hooks above still run —
     the window closes on the first score and this body resumes. */
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
        {/* The short column, stacked rather than stretched. */}
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

  /* Same window, same cure — see `ReadyBody`. */
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
        {/* 7, not 12: the rail is fixed-geometry, so a 12-wide panel is mostly
            bare paper; a 16-team bracket still fits at 7 and wider scrolls. */}
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
      {/* The preview (and its one Start) leads at every width. A viewer has
          no danger zone, so the preview takes the whole row instead of
          leaving 5 columns of paper beside it. */}
      <div className={canEdit ? "xl:col-span-7" : "xl:col-span-12"}>
        <PreviewPanel
          data={data}
          canEdit={canEdit}
          canStart={canStart}
          onStart={onStart}
        />
      </div>
      {/* Setup alone, not Setup + Event Details — both print
          `data.configLines`; see `SetupPanel`. */}
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
