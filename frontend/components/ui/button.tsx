import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/frontend/lib/utils";

const buttonVariants = cva("button", {
  variants: {
    variant: {
      default: "button-primary",
      secondary: "button-secondary",
      dark: "button-dark",
      ghost: "ghost-button",
      link: "link-button",
      icon: "icon-btn",
    },
    size: {
      default: "",
      sm: "button-small",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
