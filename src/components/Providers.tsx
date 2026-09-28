"use client";

import { AppProvider } from "@/context/AppContext";
import { AppUpdateProvider } from "@/context/AppUpdateContext";
import { AuthProvider } from "@/context/AuthContext";
import { GlobalUndoToast } from "@/components/GlobalUndoToast";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <AppUpdateProvider>
      <AuthProvider>
        <AppProvider>
          <GlobalUndoToast>{children}</GlobalUndoToast>
        </AppProvider>
      </AuthProvider>
    </AppUpdateProvider>
  );
};
