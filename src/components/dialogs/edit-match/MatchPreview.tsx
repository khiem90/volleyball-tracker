"use client";

interface MatchPreviewProps {
  homeTeamId: string;
  awayTeamId: string;
  getTeamName: (id: string) => string;
  getTeamColor: (id: string) => string;
}

export const MatchPreview = ({
  homeTeamId,
  awayTeamId,
  getTeamName,
  getTeamColor,
}: MatchPreviewProps) => {
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    return null;
  }

  return (
    <div className="mt-4 p-4 rounded-xl bg-accent/20 border border-border/30">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
        Preview
      </p>
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getTeamColor(homeTeamId) }}
          />
          <span className="font-medium">{getTeamName(homeTeamId)}</span>
        </div>
        <span className="text-muted-foreground font-bold">vs</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{getTeamName(awayTeamId)}</span>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getTeamColor(awayTeamId) }}
          />
        </div>
      </div>
    </div>
  );
};
