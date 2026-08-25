"use client";

/**
 * Root loading boundary — the first paint on every cold route. It renders the
 * REAL shell plus a skeleton grid at the final geometry, never a spinner.
 *
 * It must ask the URL which shell to draw: Next paints the OUTERMOST
 * invalidated boundary first, so a nested loading.tsx cannot remove frames
 * this one already painted — declaring `console` unconditionally flashed the
 * private sidebar on the public share and login routes. The variant here is a
 * prediction of what the page will declare;
 * `__tests__/shell/shellVariant.test.ts` fails if the two ever disagree.
 */

import { usePathname } from "next/navigation";
import {
  mbIsChromelessRoute,
  mbShellVariantFor,
} from "@/components/matchbook/AppShell";
import { MbPageLoading } from "@/components/matchbook/Loading";
import { LoginSkeleton } from "./login/LoginSkeleton";

/* `public` gets four panels, not five — its screens open on a hero over a
   7/5 pair, and a fifth panel would stand in for nothing. */
const PANELS: Record<ReturnType<typeof mbShellVariantFor>, number> = {
  console: 5,
  public: 4,
  focus: 3,
};

export default function RootLoading() {
  const pathname = usePathname();

  /* `/login` is not a shell at all — the poster's own bones are drawn. */
  if (mbIsChromelessRoute(pathname)) return <LoginSkeleton />;

  const variant = mbShellVariantFor(pathname);
  return <MbPageLoading variant={variant} panels={PANELS[variant]} />;
}
