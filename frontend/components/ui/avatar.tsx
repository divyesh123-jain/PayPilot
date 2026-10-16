import * as React from "react";
import { cn } from "@/frontend/lib/utils";

export function Avatar({
  initials,
  color,
  className,
}: {
  initials: string;
  color: string;
  className?: string;
}) {
  return (
    <span className={cn("avatar", className)} style={{ background: `${color}18`, color }}>
      {initials}
    </span>
  );
}
