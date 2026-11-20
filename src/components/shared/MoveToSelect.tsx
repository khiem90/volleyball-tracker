import { MbIcon } from "@/components/matchbook/MbIcon";

/**
 * The "Move to" menu beside a player on a mixed team. It lists the other
 * teams, and picking one calls `onMove` with that team's id. The menu
 * always shows "Move to", since the move itself is the answer.
 */
export const MoveToSelect = ({
  player,
  teams,
  disabled,
  onMove,
}: {
  /** The player's name, for a screen reader. */
  player: string;
  /** The teams the player can go to, which leaves out the one they are on. */
  teams: { id: string; name: string }[];
  disabled?: boolean;
  onMove: (teamId: string) => void;
}) => (
  <span className="relative shrink-0">
    <select
      className="mb-select-native w-auto text-[0.72rem]"
      value=""
      disabled={disabled}
      onChange={(event) => event.target.value && onMove(event.target.value)}
      aria-label={`Move ${player} to another team`}
    >
      <option value="">Move to</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
    <MbIcon
      id="chevron-down"
      size={13}
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mb-ink-muted"
    />
  </span>
);
