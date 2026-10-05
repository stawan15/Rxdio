import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { countryName, flagEmoji } from '../../lib/country'
import type { Country } from '../../services/radioApi'
import { ErrorBoundary } from '../ErrorBoundary'
import { Icon } from '../icons'
import { GlobeScene, type GlobeSceneProps } from './GlobeScene'

function Loader() {
  const { active, progress } = useProgress()
  const [done, setDone] = useState(false)
  useEffect(() => { if (!active && progress === 100) setDone(true) }, [active, progress])
  if (done) return null
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface">
      <div className="size-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      <span className="text-xs font-bold uppercase tracking-widest text-accent">Loading globe {Math.round(progress)}%</span>
    </div>
  )
}

function Fallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center text-foreground-muted">
      <Icon name="globe" size={48} />
      <p className="max-w-xs text-sm">The 3D globe isn't available on this device. Use the country search at the top to pick a station.</p>
    </div>
  )
}

type Props = Omit<GlobeSceneProps, 'onHover' | 'compact'> & { countries: Country[]; compact: boolean }

export default function GlobeView({ countries, compact, ...scene }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const [hoverCode, setHoverCode] = useState<string | null>(null)

  const onHover = useCallback((code: string | null, x: number, y: number) => {
    setHoverCode(code)
    const box = root.current?.getBoundingClientRect()
    if (tip.current && box) tip.current.style.transform = `translate(${x - box.left + 14}px, ${y - box.top + 14}px)`
  }, [])

  const hovered = countries.find(c => c.code === hoverCode)

  return (
    <div ref={root} className="absolute inset-0 select-none [-webkit-touch-callout:none]">
      <ErrorBoundary fallback={<Fallback />}>
        <Canvas
          flat
          dpr={[1, compact ? 1.5 : 2]}
          camera={{ position: [0, 0, 7], fov: 45, near: 0.1, far: 200 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          aria-label="Interactive globe. Tap a country to browse its radio stations."
        >
          <Suspense fallback={null}>
            <GlobeScene {...scene} countries={countries} compact={compact} onHover={onHover} />
          </Suspense>
        </Canvas>
        <Loader />
      </ErrorBoundary>
      <div ref={tip} className="pointer-events-none absolute left-0 top-0 z-10" aria-hidden="true">
        {hoverCode && (
          <div className="whitespace-nowrap rounded-xl border border-border bg-surface-panel px-3 py-2 text-xs font-semibold shadow-panel backdrop-blur-md">
            {flagEmoji(hoverCode)} {countryName(hoverCode, hovered?.name)}
            {hovered && <span className="ml-2 font-normal text-foreground-muted">{hovered.stationcount} stations</span>}
          </div>
        )}
      </div>
    </div>
  )
}
