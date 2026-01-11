"use client";

import { Loader2 } from "lucide-react";

export const SessionLoadingState = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Loading session...</p>
    </div>
  </div>
);
