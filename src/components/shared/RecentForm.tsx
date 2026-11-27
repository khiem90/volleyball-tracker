import type { FormResult } from "@/lib/teamShapes";

/*
 * A win is green. A loss is soft ink, never red, because red is for
 * destructive actions. Every result keeps its own color however the run
 * went, so a win reads as a win on a losing team too.
 */
const DOT: Record<FormResult, string> = {
  W: "bg-action",
  L: "bg-ink-soft",
};

/* The letter of a loss is soft ink on fill. */
const LETTER: Record<FormResult, string> = {
  W: "bg-action text-white",
  L: "bg-fill text-ink-soft",
};

/** A team's recent form as a run of dots, a win in green and a loss in soft ink, padded with faint empty slots. */
export const FormDots = ({ form, slots = 8 }: { form: FormResult[]; slots?: number }) => (
  <span className="inline-flex items-center gap-[3px]">
    {Array.from({ length: slots }, (_, i) => {
      const result = form[i];
      return <span key={i} className={`form-dot ${result ? DOT[result] : "bg-ink-soft/20"}`} />;
    })}
  </span>
);

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
