"use client";

import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { GlobalUndoToast } from "@/components/GlobalUndoToast";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <AuthProvider>
      <AppProvider>
        <GlobalUndoToast>{children}</GlobalUndoToast>
      </AppProvider>
    </AuthProvider>
  );
};
