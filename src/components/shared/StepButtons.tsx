/**
 * The − and + beside a number that goes up and down one at a time. Each
 * stops at its end of `min` to `max`. `what` names the number for a screen
 * reader: "capacity" gives "Lower the capacity by one".
 */
export const StepButtons = ({
  what,
  value,
  min,
  max,
  onChange,
}: {
  what: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) => {
  const step = "mb-btn mb-btn-outline-navy min-w-11 px-3 text-[1rem]";
  return (
    <>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Lower the ${what} by one`}
        className={step}
      >
        −
      </button>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Raise the ${what} by one`}
        className={step}
      >
        +
      </button>
    </>
  );
};
