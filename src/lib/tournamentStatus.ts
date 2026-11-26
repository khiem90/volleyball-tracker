import type { TournamentStatus } from "@/types/game";

/** How a status is drawn: its word, and the chip that carries it. */
export interface StatusLook {
  label: string;
  /** The chip's tone: green for what is live, grey for everything else. */
  tone: "action" | "fill";
  /** Whether the chip carries the live dot. */
  live: boolean;
}

/** How each tournament status is shown. No status is red: red is for destructive actions. */
export const TOURNAMENT_STATUS: Record<TournamentStatus, StatusLook> = {
  live: { label: "Live", tone: "action", live: true },
  draft: { label: "Draft", tone: "fill", live: false },
  completed: { label: "Completed", tone: "fill", live: false },
};
