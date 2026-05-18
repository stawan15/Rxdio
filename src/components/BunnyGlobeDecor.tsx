import { bunny } from '../theme'

const MARKERS = [
  { name: 'Thailand', x: 72, y: 58 },
  { name: 'Japan', x: 82, y: 42 },
  { name: 'USA', x: 22, y: 48 },
  { name: 'UK', x: 48, y: 32 },
  { name: 'Brazil', x: 32, y: 72 },
  { name: 'Australia', x: 78, y: 78 },
]

type Props = {
  selectedCountry: string
  onSelectCountry: (name: string) => void
}

/** Cute 2D globe for Ribbon Bunny mode — consistent proportions on mobile */
export function BunnyGlobeDecor({ selectedCountry, onSelectCountry }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 pb-2 pt-4">
      <div className="relative aspect-square w-full max-h-[min(38vh,260px)] max-w-[min(85vw,280px)] animate-bunny-float">
        <div
          className="absolute inset-0 rounded-full shadow-[0_20px_50px_rgb(233_140_181/0.35)]"
          style={{
            background: `radial-gradient(circle at 32% 28%, #fff 0%, ${bunny.light} 35%, ${bunny.pink} 72%, ${bunny.bg} 100%)`,
          }}
        />
        <div
          className="absolute inset-[6%] rounded-full border-2 border-white/60"
          style={{ boxShadow: 'inset 0 -8px 24px rgb(233 140 181 / 0.25)' }}
        />
        <div className="absolute inset-[18%] rounded-full bg-white/20 blur-md" />

        {MARKERS.map(m => {
          const active = selectedCountry === m.name
          return (
            <button
              key={m.name}
              type="button"
              title={m.name}
              onClick={() => onSelectCountry(m.name)}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125"
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
            >
              <span
                className={`block rounded-full border-2 border-white shadow-md ${active ? 'size-4 bg-white' : 'size-2.5 bg-accent'}`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
