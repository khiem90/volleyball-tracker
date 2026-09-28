"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DeleteConfirmDialog, PageLoadingSpinner } from "@/components/shared";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Crest, Panel, PanelEmpty } from "@/components/matchbook/Panel";
import { BracketPanel } from "@/components/console/BracketPanel";
import { ConsoleTabs, panelId, tabId, type ConsoleTab } from "@/components/console/ConsoleTabs";
import { CourtsPanel } from "@/components/console/CourtsPanel";
import { CorrectResultDialog } from "@/components/console/CorrectResultDialog";
import { EndTournamentDialog } from "@/components/console/EndTournamentDialog";
import { SchedulePanel } from "@/components/console/SchedulePanel";
import { SettingsPanel } from "@/components/console/SettingsPanel";
import { StandingsPanel } from "@/components/console/StandingsPanel";
import { StartTournamentDialog } from "@/components/console/StartTournamentDialog";
import { TeamsPanel } from "@/components/console/TeamsPanel";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { useConsole, type NotFoundReason } from "@/components/console/useConsole";
import { TOURNAMENT_STATUS } from "@/components/matchbook/tournamentStatus";
import { courtLabel, courtsWord, type ConsoleRole } from "@/lib/console";
import { STALE_SCORER_LINK } from "@/lib/shareLinks";
import { signInHref } from "@/lib/shell";
import { formatLabel, isBracketFormat, isRotationFormat } from "@/lib/formats";
import { UserMinus } from "lucide-react";

const ROLE_LABEL: Record<Exclude<ConsoleRole, "owner">, string> = {
  scorer: "Scorer",
  spectator: "Spectator",
};

/**
 * Why the console shows nothing. The tournament is not there, or not
 * shared with this phone, or the scorer link it opened has been replaced.
 * A guest is offered sign-in, coming back here, in case the tournament is theirs.
 */
const NotFound = ({ reason, isGuest }: { reason: NotFoundReason; isGuest: boolean }) => {
  const pathname = usePathname();
  const message =
    reason === "stale_link"
      ? STALE_SCORER_LINK
      : isGuest
        ? "This tournament does not exist or is not being shared. If it is yours, sign in to open it."
        : "This tournament does not exist, is not being shared, or belongs to another account.";
  return (
    <Panel title={reason === "stale_link" ? "Scorer link replaced" : "Tournament not found"}>
      <PanelEmpty
        message={message}
        actionLabel={isGuest ? "Sign in" : "Back to tournaments"}
        href={isGuest ? signInHref(pathname) : "/competitions"}
      />
    </Panel>
  );
};

/**
 * A section of the console. On a phone only the active tab's section shows;
 * from lg up every section is on screen in its column.
 */
const Section = ({
  id,
  active,
  className,
  children,
}: {
  id: ConsoleTab;
  active: ConsoleTab;
  className: string;
  children: ReactNode;
}) => (
  <section
    id={panelId(id)}
    role="tabpanel"
    aria-labelledby={tabId(id)}
    className={`${id === active ? "" : "hidden"} lg:block ${className}`}
  >
    {children}
  </section>
);

const TournamentConsole = () => {
  const { isGuest } = useAuth();
  const params = useParams();
  const page = useConsole(params.id as string);

  if (page.isLoading) {
    return <PageLoadingSpinner />;
  }

  const tournament = page.tournament;
  if (!tournament || !page.courts || !page.standings || !page.bracket) {
    // The tournament leaves the local cache before the delete resolves and
    // the list opens; the spinner covers that moment.
    if (page.isDeleting) return <PageLoadingSpinner />;
    return <NotFound reason={page.notFoundReason ?? "not_found"} isGuest={isGuest} />;
  }

  const status = TOURNAMENT_STATUS[tournament.status];
  const rotation = isRotationFormat(tournament.format);
  const bracket = isBracketFormat(tournament.format);
  const winner = tournament.winnerId ? page.team(tournament.winnerId) : null;
  // A completed tournament is listed in History, not Tournaments.
  const back =
    tournament.status === "completed"
      ? { href: "/summaries", label: "History" }
      : { href: "/competitions", label: "Tournaments" };

  return (
    <>
      {/* Masthead */}
      <header className="mb-4 flex flex-col gap-3">
        {page.role === "owner" && (
          <Link href={back.href} className="mb-panel-link min-h-11 self-start">
            <MbIcon id="chevron-right" size={11} className="rotate-180" />
            {back.label}
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="matchbook-display min-w-0 max-w-full text-3xl font-bold leading-none tracking-[0.01em] [overflow-wrap:anywhere] sm:text-5xl">
            {tournament.name}
          </h1>
          <span
            className="matchbook-display border-[2px] px-2.5 py-1.5 text-[0.9rem] font-bold tracking-[0.14em]"
            style={{ borderColor: status.color, color: status.color }}
          >
            {status.label}
          </span>
          {page.role !== "owner" && (
            <span className="matchbook-display border-[1.5px] border-mb-navy px-2 py-1.5 text-[0.62rem] font-bold tracking-[0.12em] text-mb-navy">
              {ROLE_LABEL[page.role]}
            </span>
          )}
        </div>

        <p className="matchbook-display text-[0.74rem] font-bold tracking-[0.1em]">
          {formatLabel(tournament.format)} • {tournament.entries.length} Teams •{" "}
          {page.matches.length} Matches
          {rotation
            ? ` • ${tournament.settings.courts} ${courtsWord(tournament, tournament.settings.courts)}`
            : ""}
        </p>

        {winner && (
          <div className="flex items-center gap-3">
            <Crest team={winner} size={36} />
            <div>
              <p className="mb-kicker">Winner</p>
              <p className="matchbook-display text-[1.2rem] font-bold leading-tight">
                {winner.name}
              </p>
            </div>
          </div>
        )}

        {page.access.canStart && (
          <button
            type="button"
            onClick={() => page.setStartOpen(true)}
            disabled={page.isStarting}
            className="mb-btn mb-btn-coral min-h-11 self-start"
          >
            <MbIcon id="live" size={14} />
            {page.isStarting ? "Starting..." : "Start tournament"}
          </button>
        )}

        {(page.actionError ?? page.staleNotice) && (
          <p
            role="alert"
            className="border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red"
          >
            {page.actionError ?? page.staleNotice}
          </p>
        )}
      </header>

      <ConsoleTabs tabs={page.tabs} active={page.tab} onChange={page.setTab} />

      {/* Columns from lg up; one section at a time below */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Section id="courts" active={page.tab} className="lg:col-span-5">
          <CourtsPanel
            tournament={tournament}
            view={page.courts}
            team={page.team}
            access={page.access}
            onInstantWin={page.instantWin}
            controls={{
              swapping: page.swapping,
              onSwap: page.swap,
              onCancelSwap: page.cancelSwap,
              onMove: page.move,
              busy: page.isApplying,
            }}
          />
        </Section>
        <Section
          id={page.standings.kind === "bracket" ? "bracket" : "standings"}
          active={page.tab}
          className="lg:col-span-7"
        >
          {page.standings.kind === "bracket" ? (
            <BracketPanel
              tournament={tournament}
              view={page.bracket}
              team={page.team}
              access={page.access}
              onCorrect={page.canCorrectResults ? page.openCorrection : undefined}
            />
          ) : (
            <StandingsPanel
              tournament={tournament}
              view={page.standings}
              team={page.team}
              withdrawn={page.withdrawn}
            />
          )}
        </Section>
        <Section id="schedule" active={page.tab} className="lg:col-span-4">
          <SchedulePanel
            tournament={tournament}
            rows={page.schedule}
            team={page.team}
            access={page.access}
            onCorrect={page.canCorrectResults ? page.openCorrection : undefined}
          />
        </Section>
        <Section id="teams" active={page.tab} className="lg:col-span-4">
          <TeamsPanel
            rows={page.teamRows}
            team={page.team}
            canAdd={page.canAddTeams}
            canWithdraw={page.canWithdrawTeams}
            addRefusal={page.addRefusal}
            suggestions={page.suggestions}
            joinedNote={page.joinedNote}
            onAdd={page.addTeam}
            onWithdraw={page.setWithdrawing}
            onRejoin={page.rejoin}
            busy={page.isApplying}
          />
        </Section>
        <Section id="settings" active={page.tab} className="lg:col-span-4">
          <SettingsPanel
            tournament={tournament}
            access={page.access}
            onRename={page.rename}
            onChangeCourts={page.changeCourts}
            canAddCourt={page.canAddCourt}
            canRemoveCourt={page.canRemoveCourt}
            isApplying={page.isApplying}
            links={page.links}
            onToggleSpectator={page.toggleSpectatorLink}
            onRegenerate={() => page.setRegenerateOpen(true)}
            onCreateScorerLink={page.regenerate}
            onDuplicate={page.duplicate}
            isDuplicating={page.isDuplicating}
            onEnd={() => page.setEndOpen(true)}
            onDelete={() => page.setDeleteOpen(true)}
          />
        </Section>
      </div>

      <StartTournamentDialog
        open={page.startOpen}
        onOpenChange={(open) => {
          if (!open && !page.isStarting) page.setStartOpen(false);
        }}
        tournament={tournament}
        teams={page.teams}
        isStarting={page.isStarting}
        onStart={page.start}
      />

      <EndTournamentDialog
        open={page.endOpen}
        onOpenChange={(open) => {
          if (!open && !page.isEnding) page.setEndOpen(false);
        }}
        isEnding={page.isEnding}
        onEnd={page.end}
      />

      <DeleteConfirmDialog
        open={page.deleteOpen}
        onOpenChange={(open) => {
          if (!open && !page.isDeleting) page.setDeleteOpen(false);
        }}
        title="Delete the tournament?"
        description={`This removes "${tournament.name}" and every match in it. It cannot be undone.`}
        isDeleting={page.isDeleting}
        onConfirm={page.remove}
      />

      <ConfirmDialog
        open={page.regenerateOpen}
        onOpenChange={page.setRegenerateOpen}
        title="Regenerate the scorer link?"
        description="Every phone on the current link is locked out the next time it saves a result. Share the new link with the helpers who should keep scoring."
        confirmLabel="Regenerate"
        busyLabel="Regenerating..."
        isBusy={false}
        onConfirm={page.regenerate}
      />

      <ConfirmDialog
        open={page.withdrawing !== null}
        onOpenChange={(open) => {
          if (!open && !page.isApplying) page.setWithdrawing(null);
        }}
        icon={UserMinus}
        title={`Withdraw ${page.withdrawing?.name ?? "the team"}?`}
        description={
          rotation
            ? "It leaves the queue or its court, and a match it is in is abandoned. The team it was playing stays on. Its played results stay, and it can rejoin later from Teams."
            : bracket
              ? "Its next match is forfeited and the other team goes through. Its played results stay. It cannot come back into the bracket."
              : "Its matches still to play are forfeited: each counts as a win for the other team, with no points either way. Its played results stay, and it can rejoin later from Teams."
        }
        confirmLabel="Withdraw"
        busyLabel="Withdrawing..."
        isBusy={page.isApplying && page.withdrawing !== null}
        onConfirm={page.withdraw}
      />

      <CorrectResultDialog
        match={page.correcting}
        team={page.team}
        bracket={bracket}
        isBusy={page.isApplying && page.correcting !== null}
        error={page.correcting ? page.actionError : null}
        onClose={page.closeCorrection}
        onSave={page.saveCorrection}
      />

      <ConfirmDialog
        open={page.courtsToClose !== null}
        onOpenChange={(open) => {
          if (!open && !page.isApplying) page.setCourtsToClose(null);
        }}
        title={`Close ${
          page.courtsToClose ? courtLabel(tournament, page.courtsToClose.inPlay) : "the court"
        }?`}
        description={`Its match is in play. Closing the ${courtsWord(tournament, 1)} abandons that match, and both teams go to the front of the queue.`}
        confirmLabel="Close it"
        busyLabel="Closing..."
        isBusy={page.isApplying && page.courtsToClose !== null}
        onConfirm={page.confirmCloseCourts}
      />
    </>
  );
};

// useSearchParams, which reads the scorer key, needs a Suspense boundary.
export default function TournamentConsolePage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <TournamentConsole />
    </Suspense>
  );
}
