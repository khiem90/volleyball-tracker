"use client";

import { Header } from "@/components/Header";
import { ScorePanel } from "@/components/ScorePanel";
import { History } from "@/components/History";
import { useGameState } from "@/hooks/useGameState";
import { useFullscreen } from "@/hooks/useFullscreen";

export default function HomePage() {
  const { state, addPoint, deductPoint, undo, reset, setTeamName } = useGameState();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  return (
    <main className={`flex flex-col h-screen bg-background overflow-hidden ${isFullscreen ? "relative" : ""}`}>
      {/* Header - different in fullscreen mode */}
      <Header 
        isFullscreen={isFullscreen} 
        onReset={reset} 
        onToggleFullscreen={toggleFullscreen} 
      />

      {/* Score Panels - side by side in landscape and on desktop */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden landscape-row">
        <ScorePanel
          team={state.teamA}
          variant="blue"
          isFullscreen={isFullscreen}
          onAddPoint={addPoint}
          onDeductPoint={deductPoint}
          onNameChange={setTeamName}
        />
        
        {/* Divider */}
        <div className="hidden md:block w-0.5 bg-background show-landscape" />
        <div className="block md:hidden h-0.5 bg-background hide-landscape-divider" />
        
        <ScorePanel
          team={state.teamB}
          variant="orange"
          isFullscreen={isFullscreen}
          onAddPoint={addPoint}
          onDeductPoint={deductPoint}
          onNameChange={setTeamName}
        />
      </div>

      {/* History - hidden in fullscreen and landscape mode */}
      {!isFullscreen && (
        <div className="hide-landscape">
          <History events={state.history} onUndo={undo} />
        </div>
      )}
    </main>
  );
}
