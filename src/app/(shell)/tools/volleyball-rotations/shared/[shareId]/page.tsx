"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { VolleyballCourt, RotationControls, LegendPanel } from "@/components/volleyball";
import { useUserFormations } from "@/hooks/useUserFormations";
import { getFormationByShareId } from "@/lib/volleyball/userFormations";
import { getOverlapConstraints } from "@/lib/volleyball/overlap";
import type {
  UserFormation,
  RotationNumber,
  GameMode,
  PlayerPosition,
  PlayerRole,
  MovementArrow,
} from "@/lib/volleyball/types";
import { PLAYER_COLORS, BACK_ROW_ZONES } from "@/lib/volleyball/constants";
import { ROTATION_CHART } from "@/lib/volleyball/rotations";
import { signInHref } from "@/lib/shell";
import { MotionDiv, slideUp } from "@/components/motion";
import { Card, CardEmpty, Chip, Icon, PageLoadingSpinner } from "@/components/shared";
import { PageHeader } from "@/components/shell/PageHeader";

const longDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function SharedFormationPage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.shareId as string;

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
        role: role as PlayerRole,
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
    return <PageLoadingSpinner />;
  }

  // Error state
  if (error || !formation) {
    return (
      <>
        <PageHeader title="Formation Not Found" />
        <Card className="h-auto">
          <CardEmpty
            message={error || "This formation doesn't exist or is no longer shared."}
            action={
              <Link href="/tools/volleyball-rotations" className="btn btn-ink">
                Go to Rotations Tool
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={{ href: "/tools/volleyball-rotations", label: "Back to Rotations" }}
        title={formation.name}
        status={<Chip>Shared Formation</Chip>}
        line={formation.description || undefined}
      >
        {formation.tags && formation.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3.5">
            {formation.tags.map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </div>
        )}
      </PageHeader>

      {/* Copy to My Formations CTA */}
      <MotionDiv initial="hidden" animate="visible" variants={slideUp} className="mb-4">
        <Card className="h-auto">
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-title font-semibold">
                {isAuthenticated ? "Like this formation?" : "Want to customize this formation?"}
              </p>
              <p className="text-label text-ink-soft">
                {isAuthenticated
                  ? "Copy it to your collection to customize it"
                  : "Sign in to copy it to your collection"}
              </p>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleCopyToMyFormations}
                disabled={isCopying || copied}
                className="btn btn-action sm:shrink-0"
              >
                {copied && <Icon id="check" size={18} />}
                {copied ? "Copied!" : isCopying ? "Copying..." : "Copy to My Formations"}
              </button>
            ) : (
              <Link
                href={signInHref(`/tools/volleyball-rotations/shared/${shareId}`)}
                className="btn btn-action sm:shrink-0"
              >
                Sign In
              </Link>
            )}
          </div>
        </Card>
      </MotionDiv>

      {/* Main Content Grid. Start-aligned so each card is as tall as what it holds. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Left Column: Court + Controls */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="p-4">
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
          </Card>

          <Card>
            <div className="p-4">
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
          </Card>
        </div>

        {/* Right Sidebar: Legend */}
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-20">
          <Card>
            <div className="p-4">
              <LegendPanel
                players={players}
                rotation={rotation}
                mode={mode}
                selectedPlayer={selectedPlayer}
                onPlayerSelect={setSelectedPlayer}
              />
            </div>
          </Card>

          <Card title="About This Formation">
            <dl className="flex flex-col gap-2 p-4 text-label">
              <div>
                <dt className="text-caption text-ink-soft">Created</dt>
                <dd>{longDate(formation.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-soft">Last Updated</dt>
                <dd>{longDate(formation.updatedAt)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
