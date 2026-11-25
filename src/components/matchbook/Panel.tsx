import Image from "next/image";
import { Card } from "@/components/shared/Card";
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

export const Crest = ({ team, size = 26 }: { team: MbTeam; size?: number }) => (
  <Image
    src={team.crest}
    alt=""
    width={size}
    height={Math.round(size * (112 / 96))}
    className="shrink-0"
  />
);

export const TeamMark = ({
  team,
  size = 24,
  reverse = false,
  className = "",
}: {
  team: MbTeam;
  size?: number;
  reverse?: boolean;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center gap-2 min-w-0 ${
      reverse ? "flex-row-reverse" : ""
    } ${className}`}
  >
    <Crest team={team} size={size} />
    <span className="matchbook-display font-semibold text-[0.82rem] truncate">
      {team.name}
    </span>
  </span>
);
