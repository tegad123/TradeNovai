import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-theme-gradient text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-color)] focus-visible:ring-[rgba(var(--theme-primary-rgb),0.5)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive/50",
        outline:
          "border border-[rgba(var(--theme-primary-rgb),0.3)] bg-transparent text-[var(--theme-gradient-from)] hover:bg-[rgba(var(--theme-primary-rgb),0.1)] hover:border-[rgba(var(--theme-primary-rgb),0.5)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: 
          "text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,var(--ui-opacity-5))] hover:text-white",
        link: 
          "text-[var(--theme-gradient-from)] underline-offset-4 hover:underline",
        glass:
          "glass-button text-[var(--text-secondary)] hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-color)] focus-visible:ring-[rgba(var(--theme-primary-rgb),0.4)]",
        "glass-circle":
          "glass-button text-[var(--text-secondary)] hover:text-white rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-color)] focus-visible:ring-[rgba(var(--theme-primary-rgb),0.4)]",
        "glass-theme":
          "bg-theme-gradient text-white shadow-lg shadow-[rgba(var(--theme-primary-rgb),0.25)] hover:shadow-[rgba(var(--theme-primary-rgb),0.4)] hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-color)] focus-visible:ring-[rgba(var(--theme-primary-rgb),0.5)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

