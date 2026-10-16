import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/frontend/lib/utils";

const badgeVariants = cva("status-pill", {
  variants: {
    variant: {
      success: "success",
      pending: "pending",
      danger: "danger",
      neutral: "neutral",
      soft: "policy-count",
    },
  },
  defaultVariants: { variant: "neutral" },
});
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
