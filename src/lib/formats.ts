import type { TournamentFormat } from "@/types/game";

/**
 * The five formats and what the rest of the app needs to know about them.
 * One table so the engine, the creation page, and the labels agree.
 */

export type FormatFamily = "round_robin" | "bracket" | "rotation";

export interface FormatInfo {
  label: string;
  /** Fewest teams the format is offered for. Rotation formats also need two per court. */
  minTeams: number;
  family: FormatFamily;
}

export const FORMATS: Record<TournamentFormat, FormatInfo> = {
  round_robin: { label: "Round Robin", minTeams: 3, family: "round_robin" },
  single_elimination: { label: "Single Elimination", minTeams: 2, family: "bracket" },
  double_elimination: { label: "Double Elimination", minTeams: 4, family: "bracket" },
  win2out: { label: "Win 2 & Out", minTeams: 3, family: "rotation" },
  two_match_rotation: { label: "Two Match Rotation", minTeams: 3, family: "rotation" },
};

export const FORMAT_LABELS: Record<TournamentFormat, string> = {
  round_robin: FORMATS.round_robin.label,
  single_elimination: FORMATS.single_elimination.label,
  double_elimination: FORMATS.double_elimination.label,
  win2out: FORMATS.win2out.label,
  two_match_rotation: FORMATS.two_match_rotation.label,
};

export const formatLabel = (format: TournamentFormat): string => FORMATS[format].label;

export const isBracketFormat = (format: TournamentFormat): boolean =>
  FORMATS[format].family === "bracket";

export const isRotationFormat = (format: TournamentFormat): boolean =>
  FORMATS[format].family === "rotation";

/** Formats whose matches can be played as a best-of series. */
export const isSeriesFormat = (format: TournamentFormat): boolean =>
  !isRotationFormat(format);

/** Teams needed to start, given the courts a rotation tournament will run. */
export const minimumTeams = (format: TournamentFormat, courts = 1): number =>
  Math.max(FORMATS[format].minTeams, isRotationFormat(format) ? courts * 2 : 0);

/**
 * Why a tournament cannot start with the teams it has: "Round Robin needs
 * at least 3 teams.", or for a rotation format on several courts "Win 2 &
 * Out on 2 courts needs at least 4 teams.", in the tournament's own word
 * for its courts.
 */
export const minimumTeamsMessage = (
  format: TournamentFormat,
  courts: number,
  courtsWord: string,
): string => {
  const where = isRotationFormat(format) && courts > 1 ? ` on ${courts} ${courtsWord}` : "";
  return `${formatLabel(format)}${where} needs at least ${minimumTeams(format, courts)} teams.`;
};
