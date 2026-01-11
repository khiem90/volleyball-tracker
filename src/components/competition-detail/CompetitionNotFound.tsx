"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from "lucide-react";

export const CompetitionNotFound = () => (
  <div className="min-h-screen bg-background">
    <Navigation />
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-muted/50 flex items-center justify-center">
          <Trophy className="w-12 h-12 text-muted-foreground/30" />
        </div>
        <h2 className="text-2xl font-semibold mb-3">
          Competition not found
        </h2>
        <p className="text-muted-foreground mb-8">
          This competition may have been deleted.
        </p>
        <Link href="/competitions">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Competitions
          </Button>
        </Link>
      </div>
    </main>
  </div>
);
