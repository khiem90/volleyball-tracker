"use client";

import { Suspense } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Card, CardError, Icon, PageLoadingSpinner } from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";
import { AdvancedSettings } from "@/components/creation/AdvancedSettings";
import { FormatPicker } from "@/components/creation/FormatPicker";
import { TeamChecklist } from "@/components/creation/TeamChecklist";
import { useCreation } from "@/components/creation/useCreation";
import { problemsInOrder } from "@/lib/creation";

/**
 * Creating a tournament on one page: format, name, the teams, advanced
 * settings behind a disclosure, and "Save as draft" beside "Create and
 * start". Both open the console. The teams are the roster as a checklist
 * with inline add, and those imported from an RSVP list. Create tournament
 * on a list's page opens this page with that list chosen.
 */
function NewTournamentContent() {
  const { isLoading, isAuthenticated } = useRequireAuth();
  const page = useCreation();

  if (isLoading || !isAuthenticated || page.isRosterLoading) {
    return <PageLoadingSpinner />;
  }

  const { setup, problems } = page;
  const summary = problemsInOrder(problems).join(" ");
  const alert = page.error ?? (summary || null);

  return (
    <>
      <PageHeader
        back={{ href: "/competitions", label: "Tournaments" }}
        title="New Tournament"
        line="Pick a format, name it, tick the teams or import them from an RSVP list, then start it now or keep it as a draft."
      />

      <div className="flex max-w-3xl flex-col gap-4">
        <Card title="Format">
          <FormatPicker
            value={setup.format}
            onChange={(format) => page.change({ format })}
            problem={problems.format}
          />
        </Card>

        <Card title="Name">
          <div className="flex flex-col gap-1.5 p-4">
            <label htmlFor="tournament-name" className="text-caption font-medium text-ink-soft">
              What to call it
            </label>
            <span className={`field ${problems.name ? "border-danger" : ""}`}>
              <input
                id="tournament-name"
                type="text"
                value={setup.name}
                onChange={(event) => page.change({ name: event.target.value })}
                placeholder="Tuesday night"
                maxLength={80}
                autoComplete="off"
                enterKeyHint="done"
                aria-invalid={problems.name ? true : undefined}
                aria-describedby={problems.name ? "name-problem" : undefined}
              />
            </span>
            {problems.name && (
              <p id="name-problem" role="alert" className="text-caption font-medium text-danger">
                {problems.name}
              </p>
            )}
          </div>
        </Card>

        <TeamChecklist
          roster={page.roster}
          ticked={page.ticked}
          enteredCount={page.enteredCount}
          onToggle={page.toggleTeam}
          onSetAll={page.setAllTeams}
          onAdd={page.addTeamsFromText}
          revealId={page.revealId}
          problem={problems.teams}
          listImport={page.listImport}
          importProblem={problems.imported}
        />

        <AdvancedSettings
          setup={setup}
          open={page.advancedOpen}
          onToggle={() => page.setAdvancedOpen((open) => !open)}
          onChange={page.change}
        />

        {/* The two ways to finish sit on a card, because the grey button has no edge on the ground. */}
        <div className="card gap-3 p-4">
          {alert && <CardError message={alert} className="" />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => page.create("draft")}
              disabled={page.busy !== null}
              className="btn btn-fill sm:flex-1"
            >
              <Icon id="save" size={16} />
              {page.busy === "draft" ? "Saving..." : "Save as draft"}
            </button>
            <button
              type="button"
              onClick={() => page.create("start")}
              disabled={page.busy !== null}
              className="btn btn-action sm:flex-1"
            >
              <Icon id="live" size={18} />
              {page.busy === "start" ? "Starting..." : "Create and start"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// useSearchParams, which reads the list to import, needs a Suspense boundary.
export default function NewTournamentPage() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <NewTournamentContent />
    </Suspense>
  );
}
