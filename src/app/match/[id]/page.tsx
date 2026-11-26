"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ScoringScreen } from "@/components/match";
import { PageLoadingSpinner } from "@/components/shared";
import { useMatchPage } from "@/hooks/useMatchPage";
import { STALE_SCORER_LINK } from "@/lib/shareLinks";

/**
 * The page behind the spinner and the two dead ends. It is white, because
 * the grey Home button is the ground's color and has no edge there.
 */
const Frame = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-4 text-center">
    {children}
  </div>
);

/** A match that cannot be scored from here: what happened, why, and the way home. */
const DeadEnd = ({ title, children }: { title: string; children: ReactNode }) => (
  <Frame>
    <h1 className="text-page-title font-bold">{title}</h1>
    <p className="mt-2 max-w-sm text-body text-ink-soft">{children}</p>
    <Link href="/" className="btn btn-fill mt-5">
      Home
    </Link>
  </Frame>
);

export default function MatchPage() {
  const page = useMatchPage();

  if (page.isLoading) {
    return (
      <Frame>
        <PageLoadingSpinner />
      </Frame>
    );
  }

  if (page.staleLink) {
    return <DeadEnd title="Scorer link replaced">{STALE_SCORER_LINK}</DeadEnd>;
  }

  const { match, homeTeam, awayTeam, series } = page;
  if (!match || !homeTeam || !awayTeam || !series) {
    return (
      <DeadEnd title="Match not found">
        This match does not exist or belongs to another account.
      </DeadEnd>
    );
  }

  return (
    <ScoringScreen
      home={{ name: homeTeam.name, color: homeTeam.color, score: match.homeScore }}
      away={{ name: awayTeam.name, color: awayTeam.color, score: match.awayScore }}
      status={match.status}
      series={series}
      winner={page.winner}
      access={page.access}
      notice={page.notice}
      backHref={page.backHref}
      backLabel={page.backLabel}
      canUndo={page.canUndo}
      onAddPoint={page.handleAddPoint}
      onDeductPoint={page.handleDeductPoint}
      onUndo={page.handleUndo}
      onOpenCompleteDialog={page.handleOpenCompleteDialog}
      complete={{
        open: page.showCompleteDialog,
        isBusy: page.isCompleting,
        error: page.completeError,
        onOpenChange: page.setShowCompleteDialog,
        onConfirm: page.handleCompleteMatch,
      }}
    />
  );
}
