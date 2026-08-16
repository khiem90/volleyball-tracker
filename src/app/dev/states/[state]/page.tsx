"use client";

/**
 * Dev-only harness for the FULL-PAGE feedback states (W2 / P2b). Not linked
 * from the app.
 *
 * `/dev/kit` can show a toast, a banner or a skeleton panel inside a gallery
 * cell, but it cannot show what a whole route looks like while it is loading or
 * after it has failed — those states ARE the page, chrome included, and a
 * screenshot of one squeezed into a 4-column panel proves nothing about the
 * thing that ships.
 *
 * The real routes cannot be shot directly either: `app/error.tsx` only renders
 * behind the Next dev overlay (which the screenshot harness treats as a
 * failure), `app/global-error.tsx` needs the root layout itself to throw, and
 * `app/loading.tsx` is on screen for a few milliseconds. So each state is
 * reachable here at a stable URL instead.
 *
 * Every state below renders the SAME components the routes render —
 * `MbPageLoading`, `MbRouteState`, `MbOfflineBanner`, the real global
 * `ToastHost` — so these captures are evidence, not mock-ups.
 *
 *   /dev/states/loading          console skeleton (what app/loading.tsx renders)
 *   /dev/states/loading-focus    the scoring-console variant
 *   /dev/states/loading-public   the share-screen variant
 *   /dev/states/error            what app/error.tsx renders
 *   /dev/states/notfound         what app/not-found.tsx renders
 *   /dev/states/global           what app/global-error.tsx renders
 *   /dev/states/offline          MbOfflineBanner over a live page
 *   /dev/states/toast            the toast stack + the real undo strip
 */

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { MatchbookShell } from "@/components/matchbook/AppShell";
import {
  MbPageLoading,
  MbRouteState,
  MbSkeletonPanel,
} from "@/components/matchbook/Loading";
import { MbOfflineBanner } from "@/components/matchbook/Offline";
import { toast, dismissToast } from "@/components/matchbook/Toast";
import { Panel, PanelEmpty } from "@/components/matchbook/Panel";
import { useUndo } from "@/components/GlobalUndoToast";

/** A plausible page body, so a fixed overlay can be judged against real content. */
const SamplePage = () => (
  <>
    <h1 className="matchbook-display mb-5 text-4xl mb-track-masthead font-bold leading-none sm:text-5xl">
      Tournament <span className="text-mb-coral">Overview</span>
    </h1>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <Panel title="Standings">
          <PanelEmpty message="No standings exist yet — they build as matches are completed." />
        </Panel>
      </div>
      <div className="xl:col-span-5">
        <MbSkeletonPanel rows={4} />
      </div>
    </div>
  </>
);

const ToastDemo = () => {
  const { pushUndo } = useUndo();

  useEffect(() => {
    /* Three, not four: the float stack shows `MAX_VISIBLE` at once and the
       undo strip is pinned below them, so a fourth would evict the first and
       the capture would silently under-report the stack. The fourth tone is
       shown statically in `/dev/kit#feedback`. */
    const ids = [
      toast({ tone: "info", message: "Round 4 fixtures were regenerated.", duration: 0 }),
      toast({
        tone: "warning",
        message: "Two teams are still unassigned to a court.",
        duration: 0,
        action: { label: "Assign now", icon: "queue", onClick: () => {} },
      }),
      toast({
        tone: "danger",
        message: "The result could not be saved. It is still on this device.",
        duration: 0,
        action: { label: "Retry", icon: "refresh", onClick: () => {} },
      }),
    ];

    /* The real undo strip, through the real provider — `performUndo` on a null
       snapshot only pops the stack, so this is inert. */
    pushUndo({
      actionType: "match_complete",
      description: "Riptide won 21 – 18",
      snapshot: { match: null, competition: null, newMatchId: null },
    });

    return () => ids.forEach(dismissToast);
  }, [pushUndo]);

  return (
    <MatchbookShell variant="console">
      <SamplePage />
    </MatchbookShell>
  );
};

export default function DevStatePage() {
  const params = useParams<{ state: string }>();
  const state = params?.state;

  switch (state) {
    case "loading":
      return <MbPageLoading variant="console" panels={5} />;
    case "loading-focus":
      return <MbPageLoading variant="focus" panels={2} />;
    case "loading-public":
      return <MbPageLoading variant="public" panels={5} />;

    case "error":
      return (
        <MatchbookShell variant="console">
          <MbRouteState
            state="error"
            digest="1f3a9c04b7"
            actions={[
              { label: "Try again", icon: "refresh", onClick: () => location.reload() },
              { label: "Back to overview", icon: "overview", href: "/", variant: "outline-navy" },
            ]}
          />
        </MatchbookShell>
      );

    case "notfound":
      return (
        <MatchbookShell variant="console">
          <MbRouteState
            state="notFound"
            actions={[
              { label: "Back to overview", icon: "overview", href: "/" },
              {
                label: "Browse competitions",
                icon: "compete",
                href: "/competitions",
                variant: "outline-navy",
              },
            ]}
          />
        </MatchbookShell>
      );

    case "global":
      /* `app/global-error.tsx` owns its own <html>/<body> and cannot be nested
         here, so this reproduces its BODY — the wordmark plus the same
         `MbRouteState` — which is the whole of what it draws. */
      return (
        <div className="matchbook-surface min-h-screen">
          <main id="mb-main" className="px-4 py-5 sm:px-6 lg:px-8">
            <p className="matchbook-display mb-5 text-[1.2rem] mb-track-display font-bold leading-none">
              {/* Mirrors `app/global-error.tsx`, including its ink: the harness
                  must show the colour that ships, not the one that was fixed. */}
              Tournament <span className="text-mb-coral-deep">Tracker</span>
            </p>
            <MbRouteState
              state="globalError"
              digest="1f3a9c04b7"
              actions={[
                { label: "Try again", icon: "refresh", onClick: () => location.reload() },
                {
                  label: "Reload the app",
                  icon: "overview",
                  variant: "outline-navy",
                  onClick: () => location.assign("/"),
                },
              ]}
            />
          </main>
        </div>
      );

    case "offline":
      return (
        <>
          {/* Forced, so the state is capturable without pulling the network
              cable. The shipped mount in `GlobalUndoToast` reads the hook. */}
          <MbOfflineBanner offline />
          <MatchbookShell variant="console">
            <SamplePage />
          </MatchbookShell>
        </>
      );

    case "toast":
      return <ToastDemo />;

    default:
      return (
        <MatchbookShell variant="console">
          <MbRouteState
            state="notFound"
            actions={[{ label: "Back to overview", icon: "overview", href: "/" }]}
          />
        </MatchbookShell>
      );
  }
}
