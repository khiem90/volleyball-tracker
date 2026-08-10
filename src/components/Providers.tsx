"use client";

import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { SessionProvider } from "@/context/SessionContext";
import { GlobalUndoToast } from "@/components/GlobalUndoToast";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * `ThemeProvider` used to wrap all of this. It is gone (charter Appendix A,
 * D-15: dark mode is dropped for Matchbook).
 *
 * It was not inert while it lived. On mount it wrote `light` or `dark` onto
 * `<html>` from `localStorage["tournament-tracker-theme"]` or
 * `prefers-color-scheme`, and it set `style.colorScheme` to match — so a user
 * whose OS is in dark mode, or who had ever pressed the old toggle, got
 * `<html class="dark">` on a system with exactly one palette, plus dark form
 * controls, scrollbars and `::selection` from the UA. `layout.tsx` states
 * `className="light"` and now nothing overwrites it.
 */
export const Providers = ({ children }: ProvidersProps) => {
  return (
    <AuthProvider>
      <SessionProvider>
        <AppProvider>
          <GlobalUndoToast>{children}</GlobalUndoToast>
        </AppProvider>
      </SessionProvider>
    </AuthProvider>
  );
};
