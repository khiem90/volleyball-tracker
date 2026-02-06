"use client";

import { memo, type ReactNode } from "react";
import { MotionDiv } from "@/components/motion";

type EmptyStateProps = {
  illustration: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
};

export const EmptyState = memo(function EmptyState({
  illustration,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center py-16 ${className ?? ""}`}
    >
      {illustration}
      <h2 className="text-2xl font-semibold mb-3">{title}</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        {description}
      </p>
      {actions}
    </MotionDiv>
  );
});
