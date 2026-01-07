"use client";

import { AppProvider } from "@/context/AppContext";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return <AppProvider>{children}</AppProvider>;
};

