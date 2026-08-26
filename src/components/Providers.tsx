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
 * No ThemeProvider: dark mode is dropped, the app has exactly one palette.
 * `layout.tsx` states `className="light"` and nothing may overwrite it — a
 * provider that mirrors `prefers-color-scheme` onto `<html>` hands dark form
 * controls, scrollbars and `::selection` to a system with no dark palette.
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
