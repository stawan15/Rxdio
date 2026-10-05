import { cn } from '../lib/cn'

export function EqBars({ playing = true, className }: { playing?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex h-3 items-end gap-[2px]', className)} aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <span
          key={i}
          className="w-[3px] rounded-t-[1px] bg-accent"
          style={{ height: playing ? undefined : 3, animation: playing ? `eq ${0.45 + i * 0.13}s ease-in-out infinite alternate` : undefined }}
        />
      ))}
    </span>
  )
}
