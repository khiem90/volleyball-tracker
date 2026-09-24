"use client";

import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { GlobalUndoToast } from "@/components/GlobalUndoToast";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <GlobalUndoToast>{children}</GlobalUndoToast>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
