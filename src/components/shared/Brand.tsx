import Image from "next/image";

/* The crest file is 96 by 112. */
const CREST_HEIGHT = 112 / 96;

const SIZES = {
  bar: { crest: 30, gap: "gap-2.5", name: "text-body" },
  page: { crest: 48, gap: "gap-3", name: "text-page-title" },
};

/**
 * The app's crest and its name. This is the one place either is drawn, so a
 * new crest or wordmark is a change to this file alone. The shell's top bar
 * shows the `bar` size. A page that opens with the brand, such as sign-in,
 * shows the `page` size. It is neither a link nor a heading, so whoever
 * places it wraps it in what it needs.
 */
export const Brand = ({
  size = "bar",
  className = "",
}: {
  size?: "bar" | "page";
  className?: string;
}) => {
  const { crest, gap, name } = SIZES[size];
  return (
    <span className={`flex min-w-0 items-center ${gap} ${className}`}>
      <Image
        src="/assets/matchbook/brand/crest.svg"
        alt=""
        width={crest}
        height={Math.round(crest * CREST_HEIGHT)}
        priority
        className="shrink-0"
      />
      <span className={`truncate font-extrabold leading-none tracking-[-0.01em] text-ink ${name}`}>
        Tournament Tracker
      </span>
    </span>
  );
};
