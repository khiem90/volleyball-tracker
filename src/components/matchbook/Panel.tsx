import { Card } from "@/components/shared/Card";
import { TeamMark } from "@/components/shared/TeamMark";
import type { MbTeam } from "./types";

/*
 * The old path of the card pieces, which now live in
 * @/components/shared/Card and @/components/shared/RecentForm. Each old name
 * below draws the new piece. They go when the last screen has moved.
 */
export {
  CARD_ROW as PANEL_ROW,
  CardEmpty as PanelEmpty,
  CardError as PanelError,
} from "@/components/shared/Card";
export { FormDots as FormSquares, FormLetters } from "@/components/shared/RecentForm";

/**
 * The old name of Card. `tone` is still accepted so no caller breaks, and it
 * is ignored: a card has one head, and the navy head went with the old theme.
 */
export const Panel = (props: {
  title: string;
  action?: string;
  href?: string;
  /** Sprite icon id shown before the title. */
  icon?: string;
  /** Right-aligned header content used when there is no link action. */
  meta?: React.ReactNode;
  tone?: "paper" | "navy";
  children: React.ReactNode;
  className?: string;
}) => (
  <Card
    title={props.title}
    action={props.action}
    href={props.href}
    icon={props.icon}
    meta={props.meta}
    className={props.className}
  >
    {props.children}
  </Card>
);

/** The old name for a team's mark. New code draws TeamMark from components/shared. */
export const Crest = ({ team, size = 26 }: { team: MbTeam; size?: number }) => (
  <TeamMark name={team.name} color={team.color} size={size} />
);

/** The mark and name row that was called TeamMark here. Its home is components/shared. */
export { TeamName } from "@/components/shared/TeamName";
