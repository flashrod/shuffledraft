import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-base font-medium whitespace-nowrap transition-colors outline-none disabled:pointer-events-none disabled:opacity-40 placeholder:text-[var(--color-ink-dim)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
