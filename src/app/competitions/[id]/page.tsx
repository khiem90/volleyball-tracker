"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DeleteConfirmDialog, PageLoadingSpinner } from "@/components/shared";
import { MatchbookSidebar } from "@/components/matchbook/Sidebar";
import { MatchbookMobileBar } from "@/components/matchbook/MobileBar";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { Crest, Panel, PanelEmpty } from "@/components/matchbook/Panel";
import { BracketPanel } from "@/components/console/BracketPanel";
import { ConsoleTabs, panelId, tabId, type ConsoleTab } from "@/components/console/ConsoleTabs";
import { CourtsPanel } from "@/components/console/CourtsPanel";
import { EndTournamentDialog } from "@/components/console/EndTournamentDialog";
import { SchedulePanel } from "@/components/console/SchedulePanel";
import { SettingsPanel } from "@/components/console/SettingsPanel";
import { StandingsPanel } from "@/components/console/StandingsPanel";
import { StartTournamentDialog } from "@/components/console/StartTournamentDialog";
import { TeamsPanel } from "@/components/console/TeamsPanel";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { useConsole } from "@/components/console/useConsole";
import { TOURNAMENT_STATUS } from "@/components/matchbook/tournamentStatus";
import { courtLabel, courtsWord } from "@/lib/console";
import { formatLabel, isRotationFormat } from "@/lib/formats";
import { UserMinus } from "lucide-react";

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="matchbook-surface min-h-screen">
    <div className="flex">
      <MatchbookSidebar />
      <div className="min-w-0 flex-1">
        <MatchbookMobileBar
          active="/competitions"
          cta={{ href: "/competitions", label: "Tournaments" }}
        />
        <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  </div>
);

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

export default function TournamentConsolePage() {
  const { isLoading: isAuthLoading, isAuthenticated } = useRequireAuth();
  const { user, isGuest } = useAuth();
  const params = useParams();
  const page = useConsole(params.id as string);

  if (isAuthLoading || !isAuthenticated || page.isLoading) {
    return <PageLoadingSpinner />;
  }

  const tournament = page.tournament;
  if (!tournament || !page.courts || !page.standings || !page.bracket) {
    // The tournament leaves the local cache before the delete resolves and
    // the list opens; the spinner covers that moment.
    if (page.isDeleting) return <PageLoadingSpinner />;
    return (
      <Shell>
        <Panel title="Tournament not found">
          <PanelEmpty
            message="This tournament does not exist or belongs to another account."
            actionLabel="Back to tournaments"
            href="/competitions"
          />
        </Panel>
      </Shell>
    );
  }

  const status = TOURNAMENT_STATUS[tournament.status];
  const rotation = isRotationFormat(tournament.format);
  const winner = tournament.winnerId ? page.team(tournament.winnerId) : null;

  return (
    <>
      <Shell>
        {/* Masthead */}
        <header className="mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/competitions" className="mb-panel-link min-h-11">
              <MbIcon id="chevron-right" size={11} className="rotate-180" />
              Tournaments
            </Link>
            <Link
              href="/login"
              className="hidden items-center gap-2.5 md:flex"
              title={isGuest ? "Sign in" : (user?.email ?? "Account")}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-mb-navy bg-mb-paper-bright">
                <Image src="/assets/matchbook/brand/crest.svg" alt="" width={24} height={28} />
              </span>
              <span className="matchbook-display text-[0.72rem] font-bold leading-tight tracking-[0.08em]">
                My
                <br />
                Account
              </span>
              <MbIcon id="chevron-down" size={13} className="text-mb-ink-muted" />
            </Link>
          </div>

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

          {page.actionError && (
            <p
              role="alert"
              className="border-[1.5px] border-mb-red px-3 py-2 text-[0.8rem] font-medium text-mb-red"
            >
              {page.actionError}
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
            />
          </Section>
          <Section id="teams" active={page.tab} className="lg:col-span-4">
            <TeamsPanel
              rows={page.teamRows}
              team={page.team}
              canEdit={page.canEditTeams}
              suggestions={page.suggestions}
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
              onDuplicate={page.duplicate}
              isDuplicating={page.isDuplicating}
              onEnd={() => page.setEndOpen(true)}
              onDelete={() => page.setDeleteOpen(true)}
            />
          </Section>
        </div>
      </Shell>

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
        open={page.withdrawing !== null}
        onOpenChange={(open) => {
          if (!open && !page.isApplying) page.setWithdrawing(null);
        }}
        icon={UserMinus}
        title={`Withdraw ${page.withdrawing?.name ?? "the team"}?`}
        description="It leaves the queue or its court, and a match it is in is abandoned. The team it was playing stays on. Its played results stay, and it can rejoin later from Teams."
        confirmLabel="Withdraw"
        busyLabel="Withdrawing..."
        isBusy={page.isApplying && page.withdrawing !== null}
        onConfirm={page.withdraw}
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
}
