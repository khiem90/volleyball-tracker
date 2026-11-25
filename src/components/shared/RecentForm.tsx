import type { FormResult } from "@/lib/teamShapes";

/*
 * A win is green. A loss is soft ink, never red, because red is for
 * destructive actions.
 */
const DOT: Record<FormResult, string> = {
  W: "bg-action",
  L: "bg-ink-soft",
};

const LETTER: Record<FormResult, string> = {
  W: "bg-action text-white",
  L: "bg-fill text-ink-soft",
};

/**
 * A team's recent form as a run of dots, padded with empty slots. With
 * `warnTint`, a team that has won half its matches or fewer shows every
 * result in soft ink.
 */
export const FormDots = ({
  form,
  slots = 8,
  warnTint = false,
}: {
  form: FormResult[];
  slots?: number;
  warnTint?: boolean;
}) => {
  const winCount = form.filter((result) => result === "W").length;
  const muted = warnTint && form.length > 0 && winCount <= form.length / 2;
  return (
    <span className="inline-flex items-center gap-[3px]">
      {Array.from({ length: slots }, (_, i) => {
        const result = form[i];
        const color = result ? (muted ? DOT.L : DOT[result]) : "bg-ink-soft/20";
        return <span key={i} className={`form-dot ${color}`} />;
      })}
    </span>
  );
};

/** A team's recent form as W and L in small circles. */
export const FormLetters = ({ form }: { form: FormResult[] }) => (
  <span className="inline-flex items-center gap-[2px]">
    {form.length === 0 && <span className="text-caption text-ink-soft">—</span>}
    {form.map((result, i) => (
      <span
        key={i}
        className={`inline-flex size-4 items-center justify-center rounded-full text-[0.625rem] font-bold ${LETTER[result]}`}
      >
        {result}
      </span>
    ))}
  </span>
);
