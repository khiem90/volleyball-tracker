import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Keep the development-only segment off production.
 *
 * `/dev/kit` is the primitive gallery every workstream renders into and
 * `/dev/states/[state]` previews session states that are unreachable from a
 * browser. Both are build- and screenshot-time tools.
 *
* The guard lives here rather than in `app/dev/layout.tsx` because both pages
 * are client components: `notFound()` from a layout renders the not-found body
 * but leaves the response at HTTP 200 — a soft 404 a crawler will index.
 * Measured against `next start` before this file existed: `/dev/kit` served the
 * 404 page with status 200. Middleware can set the real status.
 *
 * The layout guard stays as defence in depth: this stops the request, that
 * stops the render.
 */
export const config = { matcher: "/dev/:path*" };

export const proxy = (request: NextRequest) => {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.next();
};
