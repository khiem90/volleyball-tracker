import * as React from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeConfig = {
  sm: {
    container: "w-6 h-6 rounded-md",
    icon: "w-3 h-3",
  },
  md: {
    container: "w-8 h-8 rounded-lg",
    icon: "w-4 h-4",
  },
  lg: {
    container: "w-14 h-14 rounded-xl",
    icon: "w-7 h-7",
  },
} as const;

interface TeamBadgeProps {
  color: string;
  name?: string;
  size?: keyof typeof sizeConfig;
  showName?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const TeamBadge = React.memo(function TeamBadge({
  color,
  name,
  size = "md",
  showName = false,
  className,
  children,
}: TeamBadgeProps) {
  const config = sizeConfig[size];
  const gradientStyle = {
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          config.container,
          "flex items-center justify-center relative shrink-0"
        )}
        style={gradientStyle}
      >
        <Users className={cn(config.icon, "text-white")} />
        {children}
      </div>
      {showName && name && (
        <span className="font-medium text-sm truncate">{name}</span>
      )}
    </div>
  );
});

TeamBadge.displayName = "TeamBadge";

export { TeamBadge };
