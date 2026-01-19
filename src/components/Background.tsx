"use client";

import { memo, useState, useCallback } from "react";
import Image from "next/image";

interface BackgroundProps {
  variant?: "default" | "match" | "minimal";
  imageSrc?: string;
  children: React.ReactNode;
}

// Memoized gradient overlay component
const GradientOverlay = memo(({ variant }: { variant: string }) => {
  const getOverlayGradient = () => {
    switch (variant) {
      case "match":
        return "linear-gradient(to bottom, oklch(0.10 0.02 35 / 0.4) 0%, oklch(0.10 0.02 35 / 0.7) 50%, oklch(0.10 0.02 35 / 0.95) 100%)";
      case "minimal":
        return "linear-gradient(to bottom, oklch(0.10 0.02 35 / 0.7) 0%, oklch(0.10 0.02 35 / 0.9) 100%)";
      default:
        return "linear-gradient(to bottom, oklch(0.10 0.02 35 / 0.3) 0%, oklch(0.10 0.02 35 / 0.6) 30%, oklch(0.10 0.02 35 / 0.85) 70%, oklch(0.10 0.02 35 / 0.98) 100%)";
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[-1]"
      style={{ background: getOverlayGradient() }}
    />
  );
});
GradientOverlay.displayName = "GradientOverlay";

// Memoized decorative elements - only render for default variant
const DecorativeElements = memo(() => (
  <>
    {/* Top-right glow - simplified */}
    <div
      className="fixed top-0 right-0 w-100 h-100 z-[-1] pointer-events-none opacity-60"
      style={{
        background: "radial-gradient(circle, oklch(0.72 0.19 45 / 0.1) 0%, transparent 60%)",
        transform: "translate(30%, -30%)",
      }}
    />
    {/* Bottom-left glow - simplified */}
    <div
      className="fixed bottom-0 left-0 w-87.5 h-87.5 z-[-1] pointer-events-none opacity-50"
      style={{
        background: "radial-gradient(circle, oklch(0.78 0.15 55 / 0.08) 0%, transparent 60%)",
        transform: "translate(-30%, 30%)",
      }}
    />
  </>
));
DecorativeElements.displayName = "DecorativeElements";

// Memoized fallback gradient
const FallbackGradient = memo(({ show }: { show: boolean }) => {
  if (!show) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[-2]"
      style={{
        background: `
          radial-gradient(ellipse at 20% 20%, oklch(0.72 0.19 45 / 0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, oklch(0.78 0.15 55 / 0.08) 0%, transparent 40%),
          oklch(0.10 0.02 35)
        `,
      }}
    />
  );
});
FallbackGradient.displayName = "FallbackGradient";

export const Background = memo(({
  variant = "default",
  imageSrc,
  children
}: BackgroundProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const showFallback = !imageSrc || imageError || !imageLoaded;

  return (
    <div className="relative min-h-screen bg-background">
      {/* Background Image Layer - lazy loaded (no priority) */}
      {imageSrc && !imageError && (
        <div className="fixed inset-0 z-[-2]">
          <Image
            src={imageSrc}
            alt=""
            fill
            loading="lazy"
            className={`object-cover object-center transition-opacity duration-500 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            sizes="100vw"
            quality={75}
          />
        </div>
      )}

      {/* Fallback Gradient Background */}
      <FallbackGradient show={showFallback} />

      {/* Gradient Overlay */}
      <GradientOverlay variant={variant} />

      {/* Decorative Elements - only for default variant */}
      {variant === "default" && <DecorativeElements />}

      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
});

Background.displayName = "Background";

export default Background;
