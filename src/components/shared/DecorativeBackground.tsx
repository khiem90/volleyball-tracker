import { memo } from "react";

type DecorativeBackgroundProps = {
  variant?: "default" | "mirrored" | "dashboard";
};

export const DecorativeBackground = memo(function DecorativeBackground({
  variant = "default",
}: DecorativeBackgroundProps) {
  if (variant === "dashboard") {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="decorative-blob w-150 h-150 -top-48 -right-48 opacity-40" />
        <div className="decorative-blob w-100 h-100 top-1/3 -left-32 opacity-30" />
        <div className="decorative-blob w-75 h-75 bottom-20 right-1/4 opacity-20" />
      </div>
    );
  }

  if (variant === "mirrored") {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="decorative-blob w-150 h-150 -top-48 -left-48 opacity-30" />
        <div className="decorative-blob w-100 h-100 bottom-20 -right-32 opacity-20" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="decorative-blob w-150 h-150 -top-48 -right-48 opacity-30" />
      <div className="decorative-blob w-100 h-100 bottom-20 -left-32 opacity-20" />
    </div>
  );
});
