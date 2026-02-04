"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { VolleyballCourt, RotationControls, LegendPanel } from "@/components/volleyball";
import { useAuth } from "@/context/AuthContext";
import { useUserFormations } from "@/hooks/useUserFormations";
import { getFormationByShareId } from "@/lib/volleyball/userFormations";
import { buildPlayerPositions, buildMovementArrows } from "@/lib/volleyball/rotations";
import { getOverlapConstraints } from "@/lib/volleyball/overlap";
import type {
  UserFormation,
  RotationNumber,
  GameMode,
  FormationType,
  PlayerPosition,
  MovementArrow,
} from "@/lib/volleyball/types";
import { PLAYER_COLORS, BACK_ROW_ZONES } from "@/lib/volleyball/constants";
import { ROTATION_CHART } from "@/lib/volleyball/rotations";
import { MotionDiv, slideUp } from "@/components/motion";

export default function SharedFormationPage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.shareId as string;

  const { user, isLoading: authLoading } = useAuth();
  const { duplicate, isAuthenticated } = useUserFormations();

  const [formation, setFormation] = useState<UserFormation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Rotation state
  const [rotation, setRotation] = useState<RotationNumber>(1);
  const [mode, setMode] = useState<GameMode>("receiving");
  const [liberoActive, setLiberoActive] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showOverlaps, setShowOverlaps] = useState(true);
  const [showArrows, setShowArrows] = useState(true);

  // Fetch formation
  useEffect(() => {
    const fetchFormation = async () => {
      if (!shareId) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await getFormationByShareId(shareId);
        if (result) {
          setFormation(result);
        } else {
          setError("Formation not found or is no longer shared");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load formation");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormation();
  }, [shareId]);

  // Build player positions from custom formation data
  const players = useMemo((): PlayerPosition[] => {
    if (!formation) return [];

    const frame = formation.data[mode]?.[rotation];
    if (!frame) return [];

    const positions: PlayerPosition[] = [];
    const chart = ROTATION_CHART[rotation];

    // Determine which MB is in back row
    const getBackRowMB = (): "MB1" | "MB2" => {
      for (const [zoneStr, role] of Object.entries(chart)) {
        const zone = parseInt(zoneStr);
        if ((role === "MB1" || role === "MB2") && BACK_ROW_ZONES.includes(zone as 1 | 2 | 3 | 4 | 5 | 6)) {
          return role;
        }
      }
      return "MB1";
    };

    const backRowMB = getBackRowMB();

    for (const [zoneStr, role] of Object.entries(chart)) {
      const zone = parseInt(zoneStr) as 1 | 2 | 3 | 4 | 5 | 6;
      const isBackRow = BACK_ROW_ZONES.includes(zone);
      const isMiddleBlocker = role === "MB1" || role === "MB2";
      const shouldShowLibero = liberoActive && isBackRow && isMiddleBlocker;

      const actualRole = shouldShowLibero ? "L" : role;
      const pos = shouldShowLibero
        ? frame.roleSpots.L || frame.roleSpots[backRowMB]
        : frame.roleSpots[role];

      if (pos) {
        positions.push({
          role: actualRole,
          zone,
          position: pos,
          label: actualRole,
          color: PLAYER_COLORS[actualRole]?.bg || "gray",
          isBackRow,
          isLiberoEligible: isMiddleBlocker,
        });
      }
    }

    return positions;
  }, [formation, rotation, mode, liberoActive]);

  // Build movement arrows from custom formation data
  const arrows = useMemo((): MovementArrow[] => {
    if (!formation) return [];

    const frame = formation.data[mode]?.[rotation];
    if (!frame?.movementArrows) return [];

    return Object.entries(frame.movementArrows)
      .filter(([, arrow]) => arrow !== undefined)
      .map(([role, arrow]) => ({
        role: role as any,
        from: arrow!.from,
        to: arrow!.to,
      }));
  }, [formation, rotation, mode]);

  const overlaps = useMemo(() => getOverlapConstraints(), []);

  // Navigation
  const nextRotation = useCallback(() => {
    setRotation((prev) => (prev === 6 ? 1 : ((prev + 1) as RotationNumber)));
  }, []);

  const prevRotation = useCallback(() => {
    setRotation((prev) => (prev === 1 ? 6 : ((prev - 1) as RotationNumber)));
  }, []);

  // Copy to my formations
  const handleCopyToMyFormations = useCallback(async () => {
    if (!formation || !isAuthenticated) return;

    setIsCopying(true);
    try {
      await duplicate(formation);
      setCopied(true);
      setTimeout(() => {
        router.push("/tools/volleyball-rotations/my-formations");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy formation");
    } finally {
      setIsCopying(false);
    }
  }, [formation, isAuthenticated, duplicate, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !formation) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Formation Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error || "This formation doesn't exist or is no longer shared."}
            </p>
            <Link
              href="/tools/volleyball-rotations"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Go to Rotations Tool
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-12">
        {/* Header */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/tools/volleyball-rotations"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; Back to Rotations
            </Link>
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
              Shared Formation
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-2">
            {formation.name}
          </h1>
          {formation.description && (
            <p className="text-muted-foreground">{formation.description}</p>
          )}
          {formation.tags && formation.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formation.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-accent rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </MotionDiv>

        {/* Copy to My Formations CTA */}
        <MotionDiv
          initial="hidden"
          animate="visible"
          variants={slideUp}
          className="mb-6"
        >
          {isAuthenticated ? (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div>
                <p className="font-medium">Like this formation?</p>
                <p className="text-sm text-muted-foreground">
                  Copy it to your collection to customize it
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyToMyFormations}
                disabled={isCopying || copied}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                } disabled:opacity-50`}
              >
                {copied ? "Copied!" : isCopying ? "Copying..." : "Copy to My Formations"}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-accent/50 border border-border flex items-center justify-between">
              <div>
                <p className="font-medium">Want to customize this formation?</p>
                <p className="text-sm text-muted-foreground">
                  Sign in to copy it to your collection
                </p>
              </div>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/tools/volleyball-rotations/shared/${shareId}`)}`}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
              >
                Sign In
              </Link>
            </div>
          )}
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

            {/* Formation Info */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <h3 className="font-semibold mb-2">About This Formation</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>
                    {new Date(formation.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last Updated</dt>
                  <dd>
                    {new Date(formation.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
