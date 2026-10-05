import { useEffect, type ReactNode } from 'react'
import { Icon } from './icons'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode }

/** Bottom sheet on phones, centered modal on desktop. */
export function Dialog({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center md:items-center md:p-4">
      <button type="button" aria-label="Close dialog" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-black/70" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[88dvh] w-full animate-slide-up flex-col overflow-hidden rounded-t-3xl border border-border bg-surface-raised shadow-panel md:max-w-md md:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-surface-muted hover:bg-border">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}
