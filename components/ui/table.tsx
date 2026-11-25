import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef<HTMLTableElement, React.ComponentProps<"table">>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={cn("w-full border-collapse", className)} {...props} />
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentProps<"thead">
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentProps<"tbody">
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.ComponentProps<"tfoot">
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.ComponentProps<"tr">
>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("border-b transition-colors hover:bg-[var(--color-muted)]/10 data-[selected]:bg-[var(--color-muted)]", className)} {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ComponentProps<"th">
>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("[&_tr]:border-b [&_tr:last-child]:border-b [&_has-row-header]:pr-8", className)} {...props} />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.ComponentProps<"td">
>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("p-4 align-middle [&_tr:last-child]:border-b", className)} {...props} />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.ComponentProps<"caption">
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-[var(--color-muted)]", className)} {...props} />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
