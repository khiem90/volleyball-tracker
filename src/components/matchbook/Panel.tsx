import Link from "next/link";
import Image from "next/image";
import { MbIcon } from "./MbIcon";
import type { MbFormResult, MbTeam } from "./demo-data";

export const Panel = ({
  title,
  action,
  href,
  children,
  className = "",
}: {
  title: string;
  action?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`mb-panel ${className}`}>
    <header className="mb-panel-head">
      <h2 className="matchbook-display text-[0.95rem] font-bold tracking-[0.05em]">
        {title}
      </h2>
      {href && action && (
        <Link href={href} className="mb-panel-link">
          {action}
          <MbIcon id="chevron-right" size={11} />
        </Link>
      )}
    </header>
    {children}
  </section>
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

const FORM_COLORS: Record<MbFormResult, string> = {
  W: "var(--mb-green)",
  L: "var(--mb-red)",
};

export const FormSquares = ({
  form,
  slots = 8,
  warnTint = false,
}: {
  form: MbFormResult[];
  slots?: number;
  warnTint?: boolean;
}) => {
  const winCount = form.filter((r) => r === "W").length;
  const tint =
    warnTint && form.length > 0 && winCount <= form.length / 2
      ? winCount === 0
        ? "var(--mb-red)"
        : "var(--mb-gold)"
      : null;
  return (
    <span className="inline-flex items-center gap-[3px]">
      {Array.from({ length: slots }, (_, i) => {
        const result = form[i];
        return (
          <span
            key={i}
            className="mb-form-square"
            style={{
              background: result
                ? tint ?? FORM_COLORS[result]
                : "rgba(7, 50, 77, 0.12)",
            }}
          />
        );
      })}
    </span>
  );
};

export const FormLetters = ({ form }: { form: MbFormResult[] }) => (
  <span className="inline-flex items-center gap-[2px]">
    {form.length === 0 && (
      <span className="text-[0.7rem] text-mb-ink-muted">—</span>
    )}
    {form.map((r, i) => (
      <span
        key={i}
        className="matchbook-display inline-flex h-[14px] w-[14px] items-center justify-center rounded-[2px] text-[0.58rem] font-bold text-white"
        style={{ background: FORM_COLORS[r] }}
      >
        {r}
      </span>
    ))}
  </span>
);

export const PanelEmpty = ({
  message,
  actionLabel,
  href,
}: {
  message: string;
  actionLabel?: string;
  href?: string;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 px-4 py-8 text-center flex-1">
    <p className="text-[0.85rem] text-mb-ink-muted">{message}</p>
    {href && actionLabel && (
      <Link href={href} className="mb-btn mb-btn-outline text-[0.72rem] px-3 py-1.5">
        {actionLabel}
      </Link>
    )}
  </div>
);
