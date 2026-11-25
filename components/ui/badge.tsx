import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden border px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-accent)] text-[var(--color-bg)] border-[var(--color-accent)]",
        outline:
          "border-[var(--color-border)] bg-transparent text-[var(--color-ink-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]",
        success:
          "bg-[var(--color-terminal-green)] text-[var(--color-bg)] border-[var(--color-terminal-green)]",
        ghost:
          "border-transparent bg-transparent text-[var(--color-ink-dim)] hover:bg-[var(--color-surface)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
  })
}

export { Badge, badgeVariants }
