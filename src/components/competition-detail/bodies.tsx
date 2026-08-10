"use client";

import { useMemo } from "react";
import type { MbTabItem } from "@/components/matchbook/Tabs";
import type { MbCompetitionDetail } from "@/components/matchbook/useMatchbookCompetitionDetail";
import type { Competition, Match, PersistentTeam } from "@/types/game";
import {
  BracketPanel,
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
   =========================================================================== */

interface BodyProps {
  data: MbCompetitionDetail;
  competition: Competition;
  canEdit: boolean;
  onSelectMatch: (match: Match) => void;
  onEditMatch: (match: Match) => void;
}

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

  return (
    <>
      <FormatTabs
        items={items}
        value={tabs.value}
        onValueChange={tabs.setValue}
        label="Competition views"
      />
      <div className="mb-enter-grid grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className={`xl:col-span-7 ${tabs.groupClass("standings")}`}>
          <StandingsPanel data={data} competitionName={competition.name} />
        </div>
        <div className={`xl:col-span-5 ${tabs.groupClass("standings")}`}>
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
          <LivePanel data={data} onSelect={onSelectMatch} />
        </div>
        <div className={`xl:col-span-7 ${tabs.groupClass("results")}`}>
          <ResultsPanel lines={data.resultLines} onSelect={onSelectMatch} />
        </div>
        <div className={`xl:col-span-5 ${tabs.groupClass("results")}`}>
          <DetailsPanel data={data} createdDate={data.createdDate} />
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

  const byId = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const dispatch = (handler: (match: Match) => void) => (id: string) => {
    const match = byId.get(id);
    if (match) handler(match);
  };

  return (
    <>
      <FormatTabs
        items={items}
        value={tabs.value}
        onValueChange={tabs.setValue}
        label="Competition views"
      />
      <div className="mb-enter-grid grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className={`xl:col-span-12 ${tabs.groupClass("bracket")}`}>
          <BracketPanel
            data={data}
            canEdit={canEdit}
            onSelect={dispatch(onSelectMatch)}
            onEdit={dispatch(onEditMatch)}
          />
        </div>
        <div className={`xl:col-span-5 ${tabs.groupClass("bracket")}`}>
          <EventStatusPanel data={data} status={competition.status} />
        </div>
        <div className={`xl:col-span-7 ${tabs.groupClass("schedule")}`}>
          <LivePanel data={data} onSelect={onSelectMatch} />
        </div>
        <div className={`xl:col-span-7 ${tabs.groupClass("schedule")}`}>
          <SchedulePanel
            data={data}
            canEdit={canEdit}
            onSelect={onSelectMatch}
            onEdit={onEditMatch}
          />
        </div>
        <div className={`xl:col-span-5 ${tabs.groupClass("results")}`}>
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
}) => (
  <div className="mb-enter-grid grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
    <div className="xl:col-span-7">
      <EntrantsPanel
        teams={teams}
        canEdit={canEdit}
        onAdd={onAddTeams}
        onRemove={onRemoveTeam}
        refFor={data.refFor}
      />
    </div>
    <div className="xl:col-span-5">
      <SetupPanel data={data} />
    </div>
    <div className="xl:col-span-7">
      <PreviewPanel
        data={data}
        canEdit={canEdit}
        canStart={teams.length >= 2 && data.draft.summary.length > 0}
        onStart={onStart}
      />
    </div>
    <div className="xl:col-span-5">
      {canEdit ? (
        <DangerPanel
          name={competition.name}
          loading={deleting}
          onDelete={onDelete}
        />
      ) : (
        <DetailsPanel data={data} createdDate={data.createdDate} />
      )}
    </div>
  </div>
);
