import * as React from "react";
import { cn } from "@/frontend/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("ui-select", className)} {...props} />
));
Select.displayName = "Select";
