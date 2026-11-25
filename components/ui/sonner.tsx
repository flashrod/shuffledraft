"use client"

import { Toaster as SonnerPrimitive, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <SonnerPrimitive
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "brutalist-toast",
          description: "brutalist-toast-description",
          action: "brutalist-toast-action",
          cancel: "brutalist-toast-cancel",
        },
        style: {
          background: "var(--color-surface)",
          color: "var(--color-ink)",
          border: "1px solid var(--color-border)",
          borderRadius: "0",
          fontFamily: "var(--font-macro)",
          fontSize: "13px",
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          padding: "12px 16px",
          boxShadow: "4px 4px 0px var(--color-ink)",
        },
      } as any}
      {...props}
    />
  )
}

export { Toaster }
