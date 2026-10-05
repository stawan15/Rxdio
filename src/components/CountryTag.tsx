import { cn } from '../lib/cn'

/** ISO code as a small mono tag, in place of a flag emoji: consistent on every OS and in keeping with the instrument look. */
export function CountryTag({ code, className }: { code: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded-sm border border-border px-1 font-mono text-[0.65rem] font-medium uppercase leading-none tracking-wider text-foreground-muted',
        className,
      )}
    >
      {code || '··'}
    </span>
  )
}
