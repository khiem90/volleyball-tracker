import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/shared/Icon";
import { BLEED, GUTTER } from "./frame";

/**
 * The white block a page inside the shell opens with: the page's title, a
 * short line beside it, and the page's main action. It is the first thing in
 * the page, and it reaches out through the page's gutter to the edges of the
 * screen and up against the top bar, so on a phone the brand row and this
 * block read as one white header.
 *
 * A page one level down passes `back`. The link sits above the title, and on
 * a phone it takes the place of the brand row, which the shell hides while a
 * back link is on the page.
 *
 * Grey buttons and grey chips are the ground's color, so the white of this
 * block is what gives them an edge.
 */
export const PageHeader = ({
  title,
  status,
  line,
  action,
  back,
  children,
  className = "mb-4",
}: {
  /** The page's name, drawn as its one h1. */
  title: ReactNode;
  /** A chip beside the title, such as a tournament's status. */
  status?: ReactNode;
  /**
   * A short line beside the title, such as today's date or a tournament's
   * facts. It drops under the title when the two do not fit on one row.
   */
  line?: ReactNode;
  /**
   * The page's main action, one control or a few. It runs the full width
   * under the title on a phone and sits at the end of the title's row from
   * sm up.
   */
  action?: ReactNode;
  /** The page one level up, for a page that is not a tab's own page. */
  back?: { href: string; label: string };
  /** Anything else the block holds, under the title and the action: a tab strip, a filter row. */
  children?: ReactNode;
  /** The gap under the block. */
  className?: string;
}) => (
  <header className={`border-b border-line bg-surface ${BLEED} ${GUTTER} ${className}`}>
    {back && (
      <Link
        href={back.href}
        data-back-link
        className="-ml-1 inline-flex min-h-12 items-center gap-0.5 text-body font-semibold text-ink-soft hover:text-ink"
      >
        <Icon id="chevron-left" size={18} />
        {back.label}
      </Link>
    )}
    <div
      className={`flex flex-col gap-3.5 pb-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:pb-5 ${
        back ? "" : "pt-1 lg:pt-5"
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 sm:justify-start">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 className="min-w-0 text-page-title font-extrabold wrap-anywhere">{title}</h1>
          {status}
        </div>
        {line && <p className="min-w-0 text-label text-ink-soft">{line}</p>}
      </div>
      {action && (
        <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center">{action}</div>
      )}
    </div>
    {children}
  </header>
);
