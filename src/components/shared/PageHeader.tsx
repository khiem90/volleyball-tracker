"use client";

import { memo, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { MotionDiv, slideUp } from "@/components/motion";

type PageHeaderProps = {
  title: string;
  count?: number;
  description: string;
  actions?: ReactNode;
  className?: string;
};

export const PageHeader = memo(function PageHeader({
  title,
  count,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={slideUp}
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className ?? ""}`}
    >
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {count !== undefined && (
            <Badge
              variant="secondary"
              className="text-sm bg-primary/10 text-primary border-primary/20"
            >
              {count}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {actions}
    </MotionDiv>
  );
});
