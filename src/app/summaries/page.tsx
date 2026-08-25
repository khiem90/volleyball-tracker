"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSummariesPage } from "@/hooks/useSummariesPage";
import { DeleteConfirmDialog } from "@/components/shared";
import { MatchbookShell, MB_DEFAULT_CTA } from "@/components/matchbook/AppShell";
import {
  MB_ROUTE_SKELETON,
  MbBootPanelBones,
  MbBootSniff,
  MbLedgerBones,
  MbPageLoading,
} from "@/components/matchbook/Loading";
import { MbIcon } from "@/components/matchbook/MbIcon";
import { MbMenu } from "@/components/matchbook/Menu";
import { MbSelect, MbTextInput } from "@/components/matchbook/form";
import { MbMatchupPair } from "@/components/matchbook/MatchRow";
import { Crest, Panel, PanelEmpty, PanelStale, TeamMark } from "@/components/matchbook/Panel";
import { useLiveConnection } from "@/hooks/useLiveConnection";
import { MbLedgerPanel, MbPanelHeadLink } from "@/components/matchbook/panels";
import {
  mbArchiveContentsFor,
  useMatchbookHistory,
  type MbArchiveSection,
} from "@/components/matchbook/useMatchbookHistory";

/* ===========================================================================
   MATCH ARCHIVE

   The worst touch score of the six: 35 of 42 interactive nodes under 44px at
   390x844. Seven were the deleted mobile bar; the rest were this screen's own
   — two 42.4px filter selects, a 21.6px search input, and twenty-five 38.6px
   ledger rows. The selects and the field are now `MbSelect` / `MbTextInput`,
   which pin `min-height` to the control ladder rather than deriving a height
   from padding, and the ledger row's padding is set from the floor rather than
   from a guess.

   --------------------------------------------------- the archive with nothing in it

   Measured on a brand-new account at 390px this route was 1600px carrying SIX
   display headlines — the worst screen in the build. Three things made it, and
   only one of them was the headlines:

     251px  a filter bar filtering a set of zero: two selects reading "All
            Competitions" / "All Teams" over empty option lists, and a search
            field over nothing to search.
      48px  a masthead whose ONLY action was "Export CSV", `disabled`, because
            there is nothing to export. The screen offered no move at all.
     963px  six panels, each an empty state, each with its own display headline
            and its own hung rule.

   All three answer to the same reading: an archive is a record of things that
   happened, and on this account nothing has. So it says that ONCE, on the
   ledger — the object the whole screen is named for — and the other five
   collapse into one ruled index that names what puts something in each of
   them. The filter bar is not rendered, because a control that cannot change
   what is on screen is furniture; and the masthead action becomes the one move
   that fills an archive.

   The collapse is `panels.tsx`'s, not a new one, and it arms at TWO exactly as
   `/` and `/competitions` do — one mute panel among five populated ones is what
   `PanelEmpty` is for. The ledger is exempt for the same reason `/competitions`
   exempts its main panel: it is the principal object, its empty state names the
   one thing to do next, and it is where a filter miss has to be reported.

   `mbClosingSpan` is not used here and does not apply: this screen is not a
   twelve-column auto-flow of panels but two COLUMN STACKS (7 + 5), so a
   withheld panel shortens its column rather than stranding the next one beside
   a hole. The index takes the right column's own 5, which is the same 7+5 the
   first-run Overview sets.

   Populated behaviour is untouched, measured not asserted: on the full fixture
   `muteSections` is empty and `shared` is still loading, so `collapsed` is
   false, the filter bar renders, "Export CSV" is the masthead action, and all
   six panels sit in the two columns they always did.
   =========================================================================== */

/* ------------------------------------------------- anticipation (C14)

   The router's own `<Link>` prefetch covers the Recent Competitions rows in a
   production build, but the Shared Reports rows navigate through a menu
   `onSelect`, which no `<Link>` ever sees. One IntersectionObserver watches
   whichever rows are actually on screen and asks the router for that row's
   destination once — viewport-entry, not the whole list, so a 25-row ledger
   costs nothing and the five rows a reader can see cost one RSC payload each.
   `saveData` opts the whole thing out: anticipation is a luxury, and a metered
   connection did not ask for it. */
const useMbVisiblePrefetch = () => {
  const router = useRouter();
  const io = useRef<IntersectionObserver | null>(null);
  const fetched = useRef<Set<string>>(new Set());

  useEffect(() => () => io.current?.disconnect(), []);

  return useCallback(
    (href: string) => (node: HTMLElement | null) => {
      if (!node || fetched.current.has(href)) return;
      if (typeof IntersectionObserver === "undefined") return;
      const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
      if (nav.connection?.saveData) return;
      io.current ??= new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          const dest = target.dataset.mbPrefetch;
          if (dest && !fetched.current.has(dest)) {
            fetched.current.add(dest);
            router.prefetch(dest);
          }
          io.current?.unobserve(target);
        }
      });
      node.dataset.mbPrefetch = href;
      io.current.observe(node);
    },
    [router]
  );
};

const SummaryStat = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3">
    {/* `.mb-icon-disc` is the system's named 999px, and the only round this
        screen is allowed. `rounded-full` compiled to `calc(infinity * 1px)` —
        3.35544e+07px in the D2 census, a second spelling of the same shape. */}
    <span className="mb-icon-disc h-9 w-9">
      <MbIcon id={icon} size={16} />
    </span>
    <div>
      <p className="mb-kicker">{label}</p>
      {/* 1.2rem, not 1.15rem: `display/stat-sm` is the named step and §2.1
          points it at `SummaryStat` values by name. 1.15rem was a 0.05rem drift
          off it, and it shipped four times on this screen. */}
      <p className="matchbook-display text-[1.2rem] mb-track-display font-bold leading-tight tabular-nums">
        {value}
      </p>
    </div>
  </div>
);

/**
 * The Shared Reports rows, extracted so the fresh and the stale (C15) branches
 * render ONE list rather than two copies that can drift. Purely presentational
 * — every fact and every handler still comes from `useSummariesPage`.
 */
const SharedReportRows = ({
  shared,
}: {
  shared: ReturnType<typeof useSummariesPage>;
}) => {
  /* C14: these rows navigate through a menu `onSelect`, which no `<Link>`
     ever prefetches — the observer asks the router for each visible row's
     report route once, on viewport entry. */
  const prefetchOnSight = useMbVisiblePrefetch();
  return (
  <div className="flex flex-col divide-y divide-mb-rule">
    {shared.summaries.map((s) => (
      /* Three 14px icon keys in a row — one of them destructive and
         8px from the other two — collapse into one 48px menu. That
         is HF-2 and HF-14 answered by the same control, and it is
         the same row grammar as the compete console's event list. */
      <div
        key={s.id}
        ref={prefetchOnSight(`/summary/${s.shareCode}`)}
        className="mb-row-hover grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-4 py-2"
      >
        <MbIcon id="clipboard" size={15} className="text-mb-navy" />
        <span className="min-w-0">
          <span className="matchbook-display block truncate text-[0.78rem] mb-track-display font-bold">
            {s.name}
          </span>
          <span className="block text-[0.66rem] tabular-nums text-mb-ink-muted">
            {shared.formatDate(s.endedAt)}
          </span>
        </span>
        <MbMenu
          label={`Actions for ${s.name}`}
          items={[
            {
              label: "Open report",
              icon: "chevron-right",
              onSelect: () => shared.handleOpenSummary(s.shareCode),
            },
            {
              label:
                shared.copiedId === s.id ? "Link copied" : "Copy share link",
              icon: shared.copiedId === s.id ? "check" : "share",
              onSelect: () => shared.handleCopyLink(s),
            },
            {
              label: "Delete shared report",
              icon: "warning",
              tone: "danger",
              onSelect: () => shared.setDeleteTarget(s),
            },
          ]}
        />
      </div>
    ))}
  </div>
  );
};

export default function HistoryPage() {
  const { isLoading: authLoading, isAuthenticated } = useRequireAuth();
  const [competitionId, setCompetitionId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [query, setQuery] = useState("");
  const data = useMatchbookHistory({ competitionId, teamId, query });
  const shared = useSummariesPage();
  const prefetchOnSight = useMbVisiblePrefetch();

  /* ----------------------------------------- list-to-detail continuity (C12)

     Tapping a ledger row grows its scoreline into the Match Report panel via
     the same-document View Transitions API. All three `view-transition-name`s
     are TRANSIENT: applied at click, moved to the report's hero inside the
     update callback, removed when the transition settles — so at rest no
     element carries a name, no extra stacking contexts exist, and the DOM is
     byte-identical to the pre-C12 page. Three gates, in order:

       same row      re-selecting the open report is a no-op, not a flight
       reduced motion  never starts a transition — the tap lands its end state
                     on the next frame, which the audit's two-frame sampler
                     must read as MOTION 0
       no API        Firefox et al. take the plain `selectMatch`, same as
                     every build before this one

     `vtGen` guards the async cleanup: a second tap mid-flight supersedes the
     first transition (the API skips it), and the superseded `finished`
     handler must not strip the names the newer transition just applied. */
  const heroScoreRef = useRef<HTMLParagraphElement | null>(null);
  const heroFinalRef = useRef<HTMLParagraphElement | null>(null);
  const reportPanelRef = useRef<HTMLDivElement | null>(null);
  const vtGen = useRef(0);

  const openReport = (entryId: string, row: HTMLElement) => {
    if (entryId === data.selectedId) return;
    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      data.selectMatch(entryId);
      return;
    }
    const gen = ++vtGen.current;
    const score = row.querySelector<HTMLElement>("[data-vt-score]");
    const panel = reportPanelRef.current;
    score?.style.setProperty("view-transition-name", "mb-vt-score");
    panel?.style.setProperty("view-transition-name", "mb-vt-report");
    const settle = () => {
      if (vtGen.current !== gen) return;
      panel?.style.removeProperty("view-transition-name");
      heroScoreRef.current?.style.removeProperty("view-transition-name");
      heroFinalRef.current?.style.removeProperty("view-transition-name");
    };
    const vt = document.startViewTransition(() => {
      /* The name leaves the row in the same update that names the hero, so
         `mb-vt-score` is never on two elements at once — a duplicate name
         voids the whole transition. */
      score?.style.removeProperty("view-transition-name");
      flushSync(() => data.selectMatch(entryId));
      heroScoreRef.current?.style.setProperty("view-transition-name", "mb-vt-score");
      heroFinalRef.current?.style.setProperty("view-transition-name", "mb-vt-accent");
    });
    vt.finished.then(settle, settle);
  };

  /* ------------------------------------------------ the degraded panel (C15)

     Shared Reports is the ONE panel on this screen that crosses a network, so
     it is the one panel that can fail while the other five load. Its failure
     used to render as the empty state — a lie — and `useSummariesPage` now
     reports `faulted` plus the fetch time of whatever it can still show.

     The staleness CLASSIFICATION is not re-derived here: `useLiveConnection`
     is the same hook the share routes' status pill runs on, fed the same three
     facts (a settled subscription, the payload's arrival version, a fault),
     and its offline-outranks-faulted precedence decides which sentence the
     band prints. `tick: false` — no age counter is rendered, so no interval
     runs and a clock tick cannot re-render the archive. */
  const sharedFeed = useLiveConnection({
    subscribed: !shared.isLoading,
    version: shared.fetchedAt ?? undefined,
    faulted: shared.faulted,
    tick: false,
  });
  const sharedDegraded = !shared.isLoading && shared.faulted;
  const sharedOffline = sharedFeed.status === "offline";

  if (authLoading || !isAuthenticated) {
    return <MbPageLoading active="/summaries" />;
  }

  const report = data.report;

  /* Shared reports come from Firestore, so the hook that owns the local archive
     cannot decide this one. It counts as mute only once that load has actually
     settled — withholding it while it is still loading would pull a panel out
     from under the reader, which is the layout shift HF-3 names. A FAULTED
     load never counts as mute (C15): a failed feed is not "nothing to show",
     and folding it into the index would report an outage as an empty account.
     The panel stands and says what actually happened instead. */
  const muteSections: MbArchiveSection[] =
    !shared.isLoading && !shared.faulted && shared.summaries.length === 0
      ? [...data.muteSections, "shared"]
      : data.muteSections;

  const collapsed = muteSections.length >= 2;
  const kept = (key: MbArchiveSection) =>
    !collapsed || !muteSections.includes(key);

  /* Nothing has ever been recorded, so nothing can be filtered and nothing can
     be exported. Both tests read the WHOLE archive, never the filtered count:
     a filter that matches nothing must keep its own controls on screen. */
  const hasArchive = data.totalResults > 0;

  /* ------------------------------------------------- the boot gate (HF-3)
     Until the `localStorage` blob lands, every count above is a zero that
     means "unknown", and rendering from it painted the EMPTY composition at
     every cold load — the filter bar then mounted and the six panels swapped
     in under it, a 0.85 buffered CLS at 768. While `hydrating`, this page
     renders BOTH first-paint variants and `MbBootSniff`'s parse-time script
     hides the wrong one before the first layout: the filter bar, ledger bones
     and panel reservations for a populated account (`.mb-boot-full-only`),
     the collapsed index for a brand-new one (`.mb-boot-empty-only`). The
     reservations are the same measured numbers the route's skeleton table
     carries, read from it rather than restated. */
  const hydrating = data.hydrating;
  const [skelLedgerCol, skelSideCol] = MB_ROUTE_SKELETON["/summaries"].full.cells;
  const bootBones = {
    report: skelLedgerCol.panels[1],
    summary: skelSideCol.panels[0],
    matchups: skelSideCol.panels[1],
    competitions: skelSideCol.panels[2],
  };

  return (
    <MatchbookShell
      active="/summaries"
      cta={MB_DEFAULT_CTA}
      masthead={{
        title: (
          <>
            Match <span className="text-mb-coral">Archive</span>
          </>
        ),
        shortTitle: "History",
        badge: { value: data.totalResults, label: "Results" },
        dateLine: "All-Time Archive",
        subLine: data.dateLine,
        /* The one action, and it is always performable. "Export CSV" on an
           archive of nothing is a `disabled` button in the position a thumb
           reaches first, on a screen that offered no other move; the move that
           actually fills an archive is playing a match. Navy in both branches
           — the rail already spends the screen's one coral fill (invariant
           15), and `MB_DEFAULT_CTA` is Quick Match, so the empty branch's
           masthead action and the rail key agree rather than compete. */
        actions: hasArchive
          ? [
              {
                label: "Export CSV",
                icon: "export",
                variant: "navy",
                onClick: data.downloadCsv,
                disabled: data.filteredCount === 0,
              },
            ]
          : [
              {
                label: "Play Your First Match",
                href: "/quick-match",
                icon: "quick",
                variant: "navy",
              },
            ],
      }}
    >
      {/* The boot sniff, and it must stay ABOVE every `.mb-boot-*-only`
          element: the script runs when the parser reaches it, so everything
          below lays out with the account already known. Mounted only while
          pre-boot — a client-side navigation renders the real branches and
          none of this exists. */}
      {hydrating && <MbBootSniff />}

      {/* Filter bar. `items-end` on a row whose controls are now 48px keeps the
          three labels on one baseline; below `sm` each takes a full line rather
          than shrinking a select to the width of its chevron.

          Withheld outright when the archive is empty. Measured at 390 it is
          251px — three labelled 48px controls, stacked — and every one of them
          filters a set of zero over an empty option list: the Competition
          select had only "All Competitions" in it, the Team select only "All
          Teams", and the search field nothing to search. A control that cannot
          change what is on screen is furniture, and this was the single
          largest object on the empty screen after the panels themselves.

          While `hydrating` it renders boot-gated instead (HF-3): a populated
          account must have it IN THE FIRST PAINT — mounting it at ~1.4s pushed
          the entire ledger grid 111px — and a brand-new one must never see it.
          The controls are live but filter the not-yet-loaded archive, which is
          the same thing they do for the first 300ms on any slow device. */}
      {(hasArchive || hydrating) && (
      <div
        className={`mb-4 flex flex-wrap items-end gap-3 border-y border-mb-navy py-3${
          hydrating ? " mb-boot-full-only" : ""
        }`}
      >
        {/* `basis-full` below `sm`. Sharing the 358px content line with the
            Team select left this control 173px wide and its own value clipped
            to "ALL COMPETITIO…" — and a real selection clips harder ("FRIDAY
            NIGHT WI…"), so the reader could not read the filter they had set.
            A filter's current value is not redundant context, so it takes the
            line rather than the ellipsis. */}
        <div className="basis-full sm:basis-auto min-w-[11rem] flex-1 sm:max-w-[14rem]">
          <p className="mb-kicker mb-1">Competition</p>
          <MbSelect
            aria-label="Filter by competition"
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            placeholder="All Competitions"
            options={data.filterOptions.competitions.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
        </div>
        <div className="min-w-[10rem] flex-1 sm:max-w-[12rem]">
          <p className="mb-kicker mb-1">Team</p>
          <MbSelect
            aria-label="Filter by team"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="All Teams"
            options={data.filterOptions.teams.map((t) => ({
              value: t.id,
              label: t.name,
            }))}
          />
        </div>
        <div className="min-w-[200px] flex-[2]">
          <p className="mb-kicker mb-1">Search</p>
          <MbTextInput
            type="search"
            aria-label="Search matches, teams and competitions"
            placeholder="Search matches, teams, competitions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            trailing={
              <MbIcon id="search" size={15} className="shrink-0 text-mb-navy" />
            }
          />
        </div>
      </div>
      )}

      <div className="mb-enter-grid grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left column */}
        <div className="flex flex-col gap-4 xl:col-span-7">
          <Panel
            title="Results Ledger"
            meta={
              <span className="mb-kicker tabular-nums">{data.filteredCount} Results</span>
            }
          >
            {data.days.length === 0 ? (
              /* Two different nothings, and they were one message before.
                 With an archive on the books an empty ledger means the FILTER
                 matched nothing, and "finished matches will be recorded here"
                 is then untrue and unactionable — the move is to clear the
                 filter, so the block says that and offers the control that
                 does it.

                 With no archive at all it carries no action: the masthead
                 already prints "Play Your First Match" at the top of the page
                 in the position a thumb reaches first, and `MbStepsPanel`'s
                 own note names printing it a second time 300px lower as how a
                 screen ends up with twenty controls and no primary. */
              hasArchive ? (
                <PanelEmpty
                  tone="notfound"
                  message="No results match these filters — clear them to see the whole archive."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setCompetitionId("");
                    setTeamId("");
                    setQuery("");
                  }}
                />
              ) : hydrating ? (
                /* Pre-boot, both first paints at once: the populated ledger's
                   bones at the height the sniff computed from the blob, and
                   the first-run empty state. The injected rule shows exactly
                   one, so neither account type sees anything move when the
                   rows land (HF-3). */
                <>
                  <MbLedgerBones />
                  <div className="mb-boot-empty-only">
                    <PanelEmpty message="No results exist yet — every match you finish is filed here, newest first." />
                  </div>
                </>
              ) : (
                <PanelEmpty message="No results exist yet — every match you finish is filed here, newest first." />
              )
            ) : (
              <div className="flex flex-col">
                {data.days.map((day) => (
                  <div key={day.label}>
                    <div className="flex items-center justify-between border-b border-mb-rule bg-[var(--mb-band)] px-4 py-1.5">
                      {/* `display/meta` — 0.74rem/700/0.1em, the step the
                          masthead dateline already prints on this screen. The
                          day band is the same object one level down, so it
                          joins that step instead of opening an 11.2px one. */}
                      <p className="matchbook-display text-[0.74rem] mb-track-status font-bold tabular-nums">
                        {day.label}
                      </p>
                      <p className="mb-kicker tabular-nums">
                        {day.entries.length}{" "}
                        {day.entries.length === 1 ? "match" : "matches"}
                      </p>
                    </div>
                    {day.entries.map((entry) => (
                      /* `mb-btn-touch` supplies the 44px floor the 0.5rem
                         padding could not: the row measured 38.6px, and there
                         are twenty-five of them on a phone.

                         `sm:py-1.5`, and the split is measured twice over. At
                         8px of block padding a one-line row's content summed
                         to exactly 44, so its own `border-b` tipped the
                         border box to 45 — one px off the floor, on all
                         twenty-five desktop rows; at 6px the content sums
                         under 44 and `mb-btn-touch` governs, border included.
                         Below `sm` the row is the two-line narrow cut — a
                         content row above the floor (§3.3) at any padding —
                         and it keeps `py-2`, because shaving it 4px slid the
                         scroll-0 ledger 100px and parked a row's bottom edge
                         7.2px above the fixed bottom bar: six counted SPACING
                         pairs that did not exist before. The bar is mobile
                         chrome, so the two fixes never meet. */
                      <button
                        key={entry.id}
                        type="button"
                        onClick={(e) => openReport(entry.id, e.currentTarget)}
                        aria-pressed={entry.id === data.selectedId}
                        /* `minmax(0,1fr)` for the matchup, and the matchup is
                           ONE cell now rather than three.

                           It was `[52px_1fr_auto_1fr_auto]` with
                           `justify-self-start` / `-end` on the two marks, and a
                           grid item with a `justify-self` other than `stretch`
                           is sized by its MAX-CONTENT — so with a real club
                           roster neither name ever truncated and both painted
                           straight through the score. Measured at 390 on the
                           first row: "Rovers" at x 176.7→223.7 over "25" at
                           197.3→212.6, 15.3px of overlap, six overlapping
                           pairs in that row alone; 128 across the ledger at
                           390, 262 at 320, worst 64.6px, nothing clipping any
                           of it. `MbMatchupPair` carries the note. */
                        className="mb-btn-touch mb-row-hover grid w-full cursor-pointer grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 border-b border-mb-rule px-4 py-2 text-left sm:py-1.5"
                        style={
                          entry.id === data.selectedId
                            ? { boxShadow: "inset 3px 0 0 var(--mb-coral)" }
                            : undefined
                        }
                      >
                        {/* `body/3xs`. 0.68rem was between steps and rendered
                            twenty-five times on this one screen. */}
                        <span className="text-[0.66rem] tabular-nums text-mb-ink-muted">
                          {entry.time}
                        </span>
                        {/* `md`: the ledger row's names are `display/team-mark`
                            (0.82rem), the step this row has always set. The
                            pair keeps the mirrored `Home 25 – 20 Away` line
                            wherever it has 376px — which is every width from
                            768 up, and 1440 gives it 407 — and drops to one
                            line per team below that, where the same line was
                            painting the score through both names. */}
                        {/* The C12 flight's departure gate: `openReport` names
                            this wrapper at click time and un-names it in the
                            same update that names the report hero. A data
                            hook, not a class — it exists to be found, not to
                            be styled. */}
                        <span data-vt-score className="block min-w-0">
                        <MbMatchupPair
                          home={entry.home}
                          away={entry.away}
                          homeScore={entry.homeScore}
                          awayScore={entry.awayScore}
                          homeWon={entry.homeWon}
                          awayWon={!entry.homeWon}
                          /* The model's `homeWon` is binary and its `winner`
                             is `homeWon ? home : away`, so a drawn match would
                             mute the home side as the loser. `decided` is off
                             when the figures are level: nothing is emphasised
                             rather than the wrong thing being emphasised. */
                          decided={entry.homeScore !== entry.awayScore}
                          size="md"
                        />
                        </span>
                        {/* `w-24` was under-provisioned at desktop: the D4
                            truncation census measured 16px lost on "Friday
                            Night Win 2 & Out" at 1440, in a column that had a
                            whole empty track beside it. `xl:w-40` clears it.
                            `truncate` stays — invariant 37 — because a long
                            enough event name must still cut rather than reflow
                            the ledger. */}
                        <span className="hidden w-24 truncate text-right text-[0.66rem] text-mb-ink-muted lg:block xl:w-40">
                          {entry.competition}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
                {data.filteredCount > 25 && (
                  <p className="px-4 py-2 text-center text-[0.72rem] tabular-nums text-mb-ink-muted">
                    Showing 25 of {data.filteredCount} results — refine filters or
                    export the full CSV.
                  </p>
                )}
              </div>
            )}
          </Panel>

          {/* Each withheld-able panel slot pre-boot: a reservation at the
              measured height for the populated account, nothing for the new
              one — the collapse decides for real once the data lands. */}
          {hydrating ? (
            <MbBootPanelBones {...bootBones.report} />
          ) : kept("report") && (
          /* The C12 flight's arrival chrome. A plain block wrapper rather than
             a name on the Panel itself: `Panel` forwards no ref, and the
             wrapper is a box the transition can name transiently without the
             panel component learning anything about view transitions. */
          <div ref={reportPanelRef}>
          <Panel title="Match Report">
            {!report ? (
              <PanelEmpty message="No match report exists yet — pick a result from the ledger to see its report." />
            ) : (
              <div className="flex flex-1 flex-col gap-4 p-5 sm:flex-row sm:items-center">
                {/* `TeamMark`, not a raw crest over a raw span. The span had no
                    wrap control and no `min-w-0`, so its min-content floor was
                    the longest word in the name and the block overflowed the
                    page: measured at 320 on the fixture roster, the home block
                    laid out from x −0.8 and the away block to 320.8, taking
                    `documentElement.scrollWidth` to 321 against a 320 client
                    width — invariant 31, and with `html { overflow-x: hidden }`
                    it is the bottom nav pushed off a viewport that cannot
                    scroll to reach it. `wrap` is the right answer HERE rather
                    than an ellipsis: this panel is about the identity of two
                    teams, so a second line beats losing characters (the same
                    call `MbScoreboardHero` makes). It also puts the name on
                    `display/team-mark`, 0.82rem, which is the named step the
                    0.85rem was a drift off.

                    ------------------------------------------- the track (L2)

                    `wrap` only beats an ellipsis while the line is wide enough
                    to hold a WORD. Three items on one line — name, a 48px
                    "25 – 20", name — and this half of the panel is itself one
                    of two `flex-1` columns, so the names were sized last and
                    got what was left:

                      1440   54px per name, `[overflow-wrap:anywhere]` at
                             13.12px → 6–7 lines with 2–3 mid-word breaks and a
                             one-character last line
                      1366   43px  → 7–8 lines
                      320    30px  → NORT/HUM/BERL/AND/COAS/TAL/PANT/HERS

                    A 54px track at 1440 is a layout bug and not a long-name
                    problem, and it had two causes. The meta column beside this
                    one is `flex-1` with no `min-w-0`, so its automatic minimum
                    was the longest word in "All-time points — Northumberland
                    Coastal Panthers: 412", and it took the width off its
                    neighbour rather than eliding. And the scoreline itself had
                    no cut: three items on one line is the wide shape, and
                    below the width where a name still fits a word it has to
                    stop being one line.

                    380 = 2 × 105 + 145 + 24: 105px holds "Northumberland",
                    the roster's longest unbreakable token, at
                    `display/team-mark`; 145px is "25 – 20" at `text-5xl`; 24px
                    is the two gaps. Above it every name breaks at spaces only.
                    Below it the pair stacks — home, score, away, each on the
                    container's full width — which at 320 is 246px and sets the
                    same name on two whole-word lines.

                    Its own container, not `sm:`: this panel is 625px wide at
                    1440 and 718px at 768, and the half it hands the scoreline
                    is under 380 in both. A media query would have to stack the
                    wider one. */}
                <div className="@container flex min-w-0 flex-1 flex-col justify-center">
                  <div className="grid grid-cols-[minmax(0,1fr)] items-center justify-items-center gap-3 @min-[380px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @min-[380px]:gap-4">
                    <div className="flex w-full min-w-0 flex-col items-center gap-1.5">
                      <TeamMark
                        team={report.entry.home}
                        size={56}
                        orientation="vertical"
                        wrap
                        className="w-full"
                      />
                      <span className="mb-kicker tabular-nums">({report.homeRecord})</span>
                    </div>
                    <div className="shrink-0 text-center">
                      {/* The tracking is declared, not inherited. `text-5xl`
                          (48px) at 700 is also the masthead's `sm:` size, and the
                          masthead declares 0.01em; this numeral was falling
                          through to `.matchbook-display`'s 0.02em, so one
                          size/weight pair carried two trackings (0.48px and
                          0.96px) on this screen — rubric 1.3's exact failure. */}
                      <p
                        ref={heroScoreRef}
                        className="matchbook-display whitespace-nowrap text-5xl mb-track-masthead font-bold tabular-nums"
                      >
                        {report.entry.homeScore} – {report.entry.awayScore}
                      </p>
                      {/* The C12 accent: named `mb-vt-accent` for the flight's
                          last beat, then un-named when it settles. */}
                      <p ref={heroFinalRef} className="mb-kicker mt-1">
                        Final
                      </p>
                    </div>
                    <div className="flex w-full min-w-0 flex-col items-center gap-1.5">
                      <TeamMark
                        team={report.entry.away}
                        size={56}
                        orientation="vertical"
                        wrap
                        className="w-full"
                      />
                      <span className="mb-kicker tabular-nums">({report.awayRecord})</span>
                    </div>
                  </div>
                </div>
                {/* `min-w-0`: without it this column's automatic minimum is its
                    longest word and it takes the scoreline's width — see the
                    note above. */}
                <div className="flex min-w-0 flex-1 flex-col gap-2.5 border-t border-mb-rule pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <div className="flex items-center gap-2.5">
                    <MbIcon id="calendar" size={15} className="shrink-0 text-mb-navy" />
                    <span className="text-[0.78rem] font-semibold tabular-nums">
                      {report.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MbIcon id="clock" size={15} className="shrink-0 text-mb-navy" />
                    <span className="text-[0.78rem] font-semibold tabular-nums">
                      {report.entry.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MbIcon id="compete" size={15} className="shrink-0 text-mb-navy" />
                    <span className="text-[0.78rem] font-semibold">
                      {report.entry.competition}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MbIcon id="check" size={15} className="shrink-0 text-mb-green" />
                    <span className="text-[0.78rem] font-semibold">
                      Winner: {report.entry.winner.name}
                    </span>
                  </div>
                  <p className="mb-kicker pt-1 tabular-nums">
                    All-time points — {report.entry.home.name}: {report.homePoints} ·{" "}
                    {report.entry.away.name}: {report.awayPoints}
                  </p>
                </div>
              </div>
            )}
          </Panel>
          </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 xl:col-span-5">
          {hydrating ? (
            <MbBootPanelBones {...bootBones.summary} />
          ) : kept("summary") && (
          <Panel title="Archive Summary" tone="navy" icon="chart">
            {data.summary.matches === 0 ? (
              <PanelEmpty message="No archive exists yet — stats appear once matches are recorded." />
            ) : (
              <div className="grid grid-cols-2 gap-4 p-5">
                <SummaryStat
                  icon="calendar"
                  label="Matches Played"
                  value={String(data.summary.matches)}
                />
                <SummaryStat
                  icon="volleyball"
                  label="Total Points"
                  value={data.summary.points.toLocaleString("en-US")}
                />
                <SummaryStat icon="teams" label="Teams" value={String(data.summary.teams)} />
                <SummaryStat
                  icon="chart"
                  label="Avg Points / Match"
                  value={data.summary.avgPoints}
                />
              </div>
            )}
          </Panel>
          )}

          {hydrating ? (
            <MbBootPanelBones {...bootBones.matchups} />
          ) : kept("matchups") && (
          <Panel
            title="Top Matchups"
            meta={<span className="mb-kicker">By Games Played</span>}
          >
            {data.matchups.length === 0 ? (
              <PanelEmpty message="No matchups exist yet — rivalries build as teams replay each other." />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {data.matchups.map((m, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[18px_auto_1fr_auto] items-center gap-2 px-4 py-2"
                  >
                    {/* 0.06em declared. At 390 the mobile top strip prints its
                        short title at 0.8rem/700/0.06em, so this rank numeral
                        left on `.matchbook-display`'s 0.02em put two trackings
                        on one size/weight pair — a collision that only exists
                        below `lg`, which is why it survived a desktop read. */}
                    <span className="matchbook-display text-[0.8rem] mb-track-button font-bold tabular-nums text-mb-ink-muted">
                      {i + 1}
                    </span>
                    <span className="flex items-center gap-1">
                      <Crest team={m.a} size={20} />
                      <Crest team={m.b} size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="matchbook-display block truncate text-[0.78rem] mb-track-display font-bold">
                        {m.a.name} vs {m.b.name}
                      </span>
                      <span className="block text-[0.66rem] tabular-nums text-mb-ink-muted">
                        {m.leader}
                      </span>
                    </span>
                    <span className="matchbook-display text-[0.9rem] mb-track-display font-bold tabular-nums">
                      {m.pct}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          )}

          {hydrating ? (
            <MbBootPanelBones {...bootBones.competitions} />
          ) : kept("competitions") && (
          <Panel
            title="Recent Competitions"
            meta={<MbPanelHeadLink href="/competitions" label="View All" />}
          >
            {data.competitions.length === 0 ? (
              /* §5.7's copy rule is `No <things> exist yet — <what makes them
                 appear>.` and this was the one shipped message on the screen
                 with no second clause at all: a headline, a hung rule, and
                 nothing under it. It now says what fills it, in the same words
                 the contents index uses for the same row. */
              <PanelEmpty message="No competitions exist yet — events you create are listed here, newest first." />
            ) : (
              <div className="flex flex-col divide-y divide-mb-rule">
                {data.competitions.map((c) => (
                  /* The rung is `md` (48) and it is INLINE: `.mb-btn-touch`'s
                     44px floor is unlayered, so a `min-h-12` utility would
                     never apply — and without a stated rung the two-line
                     content floated the rows to 50.56, with `divide-y`'s 1px
                     tipping the non-last ones to 51.56. Two heights, neither
                     on the ladder. `py-1.5` brings the content (34.6px) under
                     the rung so 48 governs, dividers included. */
                  <Link
                    key={c.id}
                    /* C14: `<Link>` already viewport-prefetches in production,
                       but only to the nearest loading boundary for a dynamic
                       route — the explicit `router.prefetch` on sight warms
                       the full payload, and the shared-report rows (menu
                       navigations, no `<Link>`) ride the same observer. */
                    ref={prefetchOnSight(`/competitions/${c.id}`)}
                    href={`/competitions/${c.id}`}
                    className="mb-btn-touch mb-row-hover grid grid-cols-[auto_1fr_auto] items-center gap-2.5 px-4 py-1.5"
                    style={{ minHeight: 48 }}
                  >
                    {/* `--mb-gold` as a MARK measured 2.15:1 on paper-bright,
                        under the 3:1 floor a UI graphic needs. Navy. */}
                    <MbIcon id="compete" size={16} className="text-mb-navy" />
                    <span className="min-w-0">
                      <span className="matchbook-display block truncate text-[0.78rem] mb-track-display font-bold">
                        {c.name}
                      </span>
                      <span className="block text-[0.66rem] tabular-nums text-mb-ink-muted">
                        {c.range}
                      </span>
                    </span>
                    <span className="mb-kicker tabular-nums">{c.matches} Matches</span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
          )}

          {/* The withheld panels, as one ruled index — the same object `/` and
              `/competitions` print, cut to what is actually missing, so five
              equal display headlines become zero and every promise survives.

              Two titles for two states, exactly as `/` distinguishes them: an
              archive that has never held anything is being told what fills it,
              while an archive that is merely incomplete is being told what is
              still outstanding. `wide` is not passed — the index sits in the
              right column's own 5 of 12, where the even term/gloss split is
              the measured-good one.

              ABOVE the Shared Reports panel, deliberately: the index stands in
              for Archive Summary, Top Matchups and Recent Competitions, all of
              which print above Shared Reports on the populated page — and the
              order is also a measured CLS fix. Shared is the one panel that
              settles LATE (Firestore), and while it loads it is not yet mute;
              with the index below it, that settle withdrew the panel and
              yanked the index up 117px on a brand-new phone screen (0.0737 at
              390). With the index above, the settle only removes a node below
              it and adds a row to an element whose start never moves. */}
          {collapsed && (
            /* Pre-boot the index is the EMPTY account's first paint, so it is
               gated to that variant — a populated account gets the panel
               reservations above instead, and neither ever sees the other. */
            <div className={hydrating ? "mb-boot-empty-only" : "contents"}>
              <MbLedgerPanel
                title={hasArchive ? "Still to Come" : "What Fills This Archive"}
                rows={mbArchiveContentsFor(muteSections)}
                dense
              />
            </div>
          )}

          {kept("shared") && (
          <Panel title="Shared Reports">
            {shared.isLoading ? (
              <p className="p-4 text-center text-[0.85rem] text-mb-ink-muted">
                Loading shared reports…
              </p>
            ) : sharedDegraded && shared.summaries.length === 0 ? (
              /* The fetch failed and nothing is cached to keep showing. The
                 failed cut of the SAME `stale` vocabulary the with-data band
                 uses — never the plain empty state, which would report an
                 outage as an empty account (C15). The deck names the blast
                 radius out loud: one panel, not the screen. */
              <PanelEmpty
                tone="stale"
                icon={sharedOffline ? "wifi-off" : undefined}
                message="Shared reports could not be loaded right now — the rest of the archive is unaffected."
                actionLabel="Retry"
                onAction={shared.retry}
              />
            ) : shared.summaries.length === 0 ? (
              <PanelEmpty message="No shared reports exist yet — end a session with sharing to save one." />
            ) : sharedDegraded ? (
              /* The refresh failed but a previous load is cached: last known
                 rows, greyed under the dated band, still openable — a report's
                 own route re-fetches independently, so stale is not dead. */
              <PanelStale
                asOf={shared.fetchedAt}
                offline={sharedOffline}
                onRetry={shared.retry}
              >
                <SharedReportRows shared={shared} />
              </PanelStale>
            ) : (
              <SharedReportRows shared={shared} />
            )}
          </Panel>
          )}

        </div>
      </div>

      <DeleteConfirmDialog
        open={!!shared.deleteTarget}
        onOpenChange={(open) => !open && shared.setDeleteTarget(null)}
        title="Delete Shared Report?"
        description={`This will permanently delete "${shared.deleteTarget?.name ?? ""}" and its share link.`}
        onConfirm={shared.handleDelete}
        isDeleting={shared.isDeleting}
      />
    </MatchbookShell>
  );
}
