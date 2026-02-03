"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import {
  VolleyballCourt,
  RotationControls,
  LegendPanel,
  HelpAccordion,
  FormationSelector,
} from "@/components/volleyball";
import { useVolleyballRotation } from "@/hooks/useVolleyballRotation";
import { MotionDiv, slideUp } from "@/components/motion";

export default function VolleyballRotationsPage() {
  const {
    rotation,
    mode,
    formation,
    liberoActive,
    players,
    arrows,
    overlaps,
    setRotation,
    setMode,
    setFormation,
    setLiberoActive,
    nextRotation,
    prevRotation,
  } = useVolleyballRotation();

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showOverlaps, setShowOverlaps] = useState(true);
  const [showArrows, setShowArrows] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-12">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 uppercase">
            5-1 Volleyball <span className="text-primary">Rotations</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Interactive visualization of all 6 rotations with overlap rules,
            formation variants, and movement transitions
          </p>
        </MotionDiv>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left Column: Court + Controls */}
          <div className="space-y-6">
            {/* Controls Card */}
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-soft">
              <RotationControls
                rotation={rotation}
                mode={mode}
                liberoActive={liberoActive}
                showOverlaps={showOverlaps}
                showArrows={showArrows}
                onRotationChange={setRotation}
                onModeChange={setMode}
                onLiberoToggle={setLiberoActive}
                onShowOverlapsToggle={setShowOverlaps}
                onShowArrowsToggle={setShowArrows}
                onNext={nextRotation}
                onPrev={prevRotation}
              />
            </div>

            {/* Court Visualization Card */}
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-soft">
              <VolleyballCourt
                players={players}
                overlaps={overlaps}
                arrows={arrows}
                selectedPlayer={selectedPlayer}
                onPlayerSelect={setSelectedPlayer}
                mode={mode}
                showOverlaps={showOverlaps}
                showArrows={showArrows}
              />
            </div>

            {/* Formation Selector Card */}
            <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-soft">
              <FormationSelector
                formation={formation}
                rotation={rotation}
                onFormationChange={setFormation}
              />
            </div>

            {/* Help Accordion (visible on mobile, hidden on lg) */}
            <div className="lg:hidden">
              <HelpAccordion />
            </div>
          </div>

          {/* Right Sidebar: Legend */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:h-fit">
            {/* Legend Panel */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <LegendPanel
                players={players}
                rotation={rotation}
                mode={mode}
                selectedPlayer={selectedPlayer}
                onPlayerSelect={setSelectedPlayer}
              />
            </div>

            {/* Help Accordion (hidden on mobile, visible on lg) */}
            <div className="hidden lg:block">
              <HelpAccordion />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
