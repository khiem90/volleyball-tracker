import Image from "next/image";
import { CREST_SRC } from "@/lib/assetPaths";

/* The crest file is 96 by 112. */
const CREST_HEIGHT = 112 / 96;

const SIZES = {
  bar: { crest: 30, name: "text-body" },
  page: { crest: 36, name: "text-title" },
};

/**
 * The app's crest and its name. This is the one place either is drawn, so a
 * new crest or wordmark is a change to this file alone. The shell's top bar
 * shows the `bar` size, and sign-in, which opens with the brand, shows the
 * `page` size. It is neither a link nor a heading, so whoever places it
 * wraps it in what it needs. The crest is decoration and the name is text,
 * so a link around the two is named by the name.
 */
export const Brand = ({
  size = "bar",
  className = "",
}: {
  size?: "bar" | "page";
  className?: string;
}) => {
  const { crest, name } = SIZES[size];
  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <Image
        src={CREST_SRC}
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
