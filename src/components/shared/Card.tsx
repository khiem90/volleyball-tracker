import Link from "next/link";
import { Icon } from "./Icon";

/**
 * A white surface with an optional head. The head shows when there is a
 * title, and takes a glyph before the title and one thing on the right: a
 * link when both `action` and `href` are given, otherwise the `meta` slot,
 * which holds a count or a live tag. A meta that is plain text is written as
 * secondary text. Anything else is drawn as it comes.
 */
export const Card = ({
  title,
  action,
  href,
  icon,
  meta,
  children,
  className = "",
}: {
  title?: string;
  /** The words of the head's link. Shown only with `href`. */
  action?: string;
  href?: string;
  /** Sprite icon id shown before the title. */
  icon?: string;
  /** Right-aligned head content, used when there is no link. */
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`card ${className}`}>
    {title !== undefined && (
      <header className="card-head">
        <h2 className="card-title">
          {icon && (
            <span className="card-icon">
              <Icon id={icon} size={14} />
            </span>
          )}
          {title}
        </h2>
        {href && action ? (
          <Link href={href} className="card-link">
            {action}
            <Icon id="chevron-right" size={12} />
          </Link>
        ) : typeof meta === "string" ? (
          <span className="text-caption text-ink-soft">{meta}</span>
        ) : (
          meta
        )}
      </header>
    )}
    {children}
  </section>
);

/**
 * A tappable row in a card's list: 44px at least, with the hover wash. Its
 * focus ring is drawn inside the row, because a card clips what reaches past
 * its edge. Rows are divided by putting `divide-y divide-line` on their list.
 */
export const CARD_ROW =
  "min-h-11 px-4 py-3 transition-colors hover:bg-ink/4 focus-visible:-outline-offset-2";

/**
 * The link at a card's foot that leads to the rest of its list: green and
 * bold, in the middle of a row of its own under a line rule. It keeps to the
 * foot when the card is taller than its rows.
 */
export const CARD_FOOT_LINK = `card-link mt-auto justify-center border-t border-line text-body font-bold text-action ${CARD_ROW}`;

/**
 * Something that went wrong, in danger. Inside a card it explains why the
 * card has nothing to show. Pass a className to place it anywhere else.
 */
export const CardError = ({
  message,
  className = "m-4",
}: {
  message: string;
  className?: string;
}) => (
  <p
    role="alert"
    className={`rounded-tile border border-danger/40 bg-danger-tint px-3 py-2 text-caption font-medium text-danger ${className}`}
  >
    {message}
  </p>
);

/** Why a card is empty, with one way forward under it. */
export const CardEmpty = ({
  message,
  actionLabel,
  href,
  action,
}: {
  message: string;
  actionLabel?: string;
  href?: string;
  /** A control of the page's own, in place of the grey link that actionLabel and href make. */
  action?: React.ReactNode;
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
    <p className="text-label text-ink-soft">{message}</p>
    {action}
    {!action && href && actionLabel && (
      <Link href={href} className="btn btn-fill">
        {actionLabel}
      </Link>
    )}
  </div>
);
