import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-ink)] text-[var(--color-surface)] hover:bg-[var(--color-ink-soft)]",
        outline:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[#f5f5f2] hover:border-[#d4d4d4]",
        secondary:
          "bg-[#f5f5f2] text-[var(--color-ink-soft)] hover:bg-[#eaeaea]",
        ghost:
          "hover:bg-[#f5f5f2] hover:text-[var(--color-ink)]",
      },
      size: {
        default: "h-10 gap-1.5 px-4",
        sm: "h-8 gap-1 px-3 text-xs",
        lg: "h-11 gap-1.5 px-5 text-base",
        icon: "size-10 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
