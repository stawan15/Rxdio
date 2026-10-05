import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { useParentHeight } from '../hooks/useMediaQuery'

export type Snap = 'peek' | 'half' | 'full'

const PEEK = 128
const SNAPS: Snap[] = ['peek', 'half', 'full']

type Props = {
  snap: Snap
  onSnapChange: (snap: Snap) => void
  /** Reports the settled height so the globe can re-center above the sheet. */
  onHeight: (px: number) => void
  children: ReactNode
}

/** Phone-only draggable sheet that snaps to peek / half / full. Drag the handle, or tap it to toggle. */
export function BottomSheet({ snap, onSnapChange, onHeight, children }: Props) {
  const [setRoot, parentHeight] = useParentHeight<HTMLDivElement>()
  const heights: Record<Snap, number> = {
    peek: PEEK,
    half: Math.max(Math.round(parentHeight * 0.52), PEEK),
    full: Math.max(parentHeight - 12, PEEK),
  }
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const gesture = useRef({ startY: 0, startHeight: 0, lastY: 0, lastT: 0, velocity: 0 })

  const settled = Math.min(heights[snap], heights.half)
  useEffect(() => onHeight(settled), [settled, onHeight])

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    gesture.current = { startY: e.clientY, startHeight: heights[snap], lastY: e.clientY, lastT: e.timeStamp, velocity: 0 }
    setDragHeight(heights[snap])
  }

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragHeight === null) return
    const g = gesture.current
    g.velocity = (g.lastY - e.clientY) / Math.max(e.timeStamp - g.lastT, 1)
    g.lastY = e.clientY
    g.lastT = e.timeStamp
    setDragHeight(Math.min(Math.max(g.startHeight + g.startY - e.clientY, PEEK), heights.full))
  }

  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragHeight === null) return
    const g = gesture.current
    setDragHeight(null)
    if (Math.abs(g.startY - e.clientY) < 6) { onSnapChange(snap === 'peek' ? 'half' : 'peek'); return }
    const projected = dragHeight + g.velocity * 180
    onSnapChange(SNAPS.reduce((best, s) => (Math.abs(heights[s] - projected) < Math.abs(heights[best] - projected) ? s : best)))
  }

  return (
    <div
      ref={setRoot}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-3xl border-x border-t border-border bg-surface/95 shadow-player backdrop-blur-xl"
      style={{ height: dragHeight ?? heights[snap], transition: dragHeight === null ? 'height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' }}
    >
      <button
        type="button"
        aria-label={snap === 'peek' ? 'Expand station list' : 'Collapse station list'}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="flex h-8 w-full shrink-0 cursor-grab touch-none items-center justify-center"
      >
        <span className="h-1.5 w-10 rounded-full bg-foreground/25" />
      </button>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
