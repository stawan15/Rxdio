import { Suspense, useCallback, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { countryName } from '../../lib/country'
import type { Country } from '../../services/radioApi'
import { CountryTag } from '../CountryTag'
import { ErrorBoundary } from '../ErrorBoundary'
import { Icon } from '../icons'
import { GlobeScene, type GlobeSceneProps } from './GlobeScene'

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
            <GlobeScene {...scene} countries={countries} onHover={onHover} />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
      <div ref={tip} className="pointer-events-none absolute left-0 top-0 z-10" aria-hidden="true">
        {hoverCode && (
          <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface-panel px-2.5 py-2 text-xs font-medium shadow-panel">
            <CountryTag code={hoverCode} />
            {countryName(hoverCode, hovered?.name)}
            {hovered && <span className="font-mono text-[0.65rem] uppercase tracking-wide text-foreground-muted">{hovered.stationcount} stations</span>}
          </div>
        )}
      </div>
    </div>
  )
}
