"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ScoringScreen } from "@/components/match";
import { useMatchPage } from "@/hooks/useMatchPage";
import { STALE_SCORER_LINK } from "@/lib/shareLinks";

/** The paper page behind the spinner and the not-found message. */
const Frame = ({ children }: { children: ReactNode }) => (
  <div className="matchbook-surface flex min-h-dvh flex-col items-center justify-center px-4 text-center">
    {children}
  </div>
);

export default function MatchPage() {
  const page = useMatchPage();

  if (page.isLoading) {
    return (
      <Frame>
        <Loader2 className="h-8 w-8 animate-spin text-mb-navy" aria-label="Loading" />
      </Frame>
    );
  }

  if (page.staleLink) {
    return (
      <Frame>
        <h1 className="matchbook-display text-2xl font-bold text-mb-navy">Scorer link replaced</h1>
        <p className="mt-2 max-w-sm text-[0.85rem] text-mb-ink-muted">{STALE_SCORER_LINK}</p>
        <Link href="/" className="mb-btn mb-btn-outline-navy mt-5 min-h-11">
          Home
        </Link>
      </Frame>
    );
  }

  const { match, homeTeam, awayTeam, series } = page;
  if (!match || !homeTeam || !awayTeam || !series) {
    return (
      <Frame>
        <h1 className="matchbook-display text-2xl font-bold text-mb-navy">Match not found</h1>
        <p className="mt-2 max-w-sm text-[0.85rem] text-mb-ink-muted">
          This match does not exist or belongs to another account.
        </p>
        <Link href="/" className="mb-btn mb-btn-outline-navy mt-5 min-h-11">
          Home
        </Link>
      </Frame>
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
