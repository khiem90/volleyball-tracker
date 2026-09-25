import type { TournamentStatus } from "@/types/game";

/** How each tournament status is shown: its word and its color. */
export const TOURNAMENT_STATUS: Record<TournamentStatus, { label: string; color: string }> = {
  live: { label: "Live", color: "var(--mb-red)" },
  draft: { label: "Draft", color: "var(--mb-gold)" },
  completed: { label: "Completed", color: "var(--mb-green)" },
};
