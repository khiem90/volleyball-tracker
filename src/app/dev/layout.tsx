import { notFound } from "next/navigation";

/**
 * Development-only segment.
 *
 * `/dev/kit` is the primitive gallery every workstream renders its components
 * into, and `/dev/states/[state]` previews the session states that are
 * unreachable from a browser. Both are build- and screenshot-time tools; neither
 * should be reachable by a user.
 *
 * `NODE_ENV` is inlined at build time, so in a production build this collapses
 * to an unconditional `notFound()`.
 *
 * `force-dynamic` is what makes that a REAL 404. Left static, the segment
 * prerenders the not-found *body* at build time but serves it with HTTP 200 — a
 * soft 404 that a crawler will happily index. Rendering per request lets
 * `notFound()` set the status. Verified against the production server: the
 * gallery markup is absent and the status is 404, not 200.
 */
export const dynamic = "force-dynamic";
export default async function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <>{children}</>;
}
