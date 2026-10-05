import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react'
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { BORDERS, centroidOf, findCountryAt, latLonToXYZ, nearestCountry, xyzToLatLon, type LatLon } from '../../lib/geo'
import { subsolarPoint } from '../../lib/sun'
import { GLOBE_LOOK, type ThemeMode } from '../../theme'
import type { Country } from '../../services/radioApi'
import { EqBars } from '../EqBars'
import { countryTones } from '../../lib/mapColors'
import { mapFragment, vertex } from './shaders'

const EARTH_RADIUS = 2
const GLOBE_DIAMETER = 4.2 // used to fit the camera
const Y_AXIS = new THREE.Vector3(0, 1, 0)

const toVector = (lat: number, lon: number, radius: number) => new THREE.Vector3(...latLonToXYZ(lat, lon, radius))
const hasBorder = (code: string) => BORDERS.some(b => b.code === code)

// --- the map: land shades and borders are painted into an equirectangular canvas wrapped around the globe -------

type Paths = { fill: Path2D; stroke: Path2D }
const pathCache = new Map<string, Paths>()

function pathsFor(code: string, w: number, h: number): Paths {
  const key = `${w}:${code}`
  let paths = pathCache.get(key)
  if (!paths) {
    const fill = new Path2D()
    const stroke = new Path2D()
    for (const ring of BORDERS.find(b => b.code === code)?.rings ?? []) {
      // a few rings (Russia, Fiji, Antarctica) jump between +180 and -180: unwrap them, then draw a copy one map-width over
      const unwrapped: [number, number][] = []
      let shift = 0
      ring.forEach(([lon, lat], i) => {
        if (i > 0 && lon + shift - unwrapped[i - 1][0] > 180) shift -= 360
        else if (i > 0 && lon + shift - unwrapped[i - 1][0] < -180) shift += 360
        unwrapped.push([lon + shift, lat])
      })
      for (const offset of [0, -360, 360]) {
        unwrapped.forEach(([lon, lat], i) => {
          const x = ((lon + offset + 180) / 360) * w
          const y = ((90 - lat) / 180) * h
          if (i === 0) fill.moveTo(x, y)
          else fill.lineTo(x, y)
          const [pl, pa] = unwrapped[i - 1] ?? [lon, lat]
          // skip edges along the ±180° seam where polygons were cut, so no stray meridian line appears
          const onSeam = i > 0 && Math.abs(pl) % 360 === 180 && Math.abs(lon) % 360 === 180 && pl === lon
          if (i > 0 && !onSeam) {
            stroke.moveTo(((pl + offset + 180) / 360) * w, ((90 - pa) / 180) * h)
            stroke.lineTo(x, y)
          }
        })
        fill.closePath()
      }
    }
    paths = { fill, stroke }
    pathCache.set(key, paths)
  }
  return paths
}

function paintMap(ctx: CanvasRenderingContext2D, w: number, h: number, look: (typeof GLOBE_LOOK)[ThemeMode]) {
  const tones = countryTones(look.tones.length)
  ctx.fillStyle = look.ocean
  ctx.fillRect(0, 0, w, h)
  for (const { code } of BORDERS) {
    ctx.fillStyle = look.tones[tones.get(code) ?? 0]
    ctx.fill(pathsFor(code, w, h).fill)
  }
  ctx.strokeStyle = look.border
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1.2, w / 2800)
  for (const { code } of BORDERS) ctx.stroke(pathsFor(code, w, h).stroke)
}

function paintHighlight(ctx: CanvasRenderingContext2D, w: number, h: number, selected: string, hover: string | null, look: (typeof GLOBE_LOOK)[ThemeMode]) {
  ctx.clearRect(0, 0, w, h)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (hover && hover !== selected) {
    const { fill, stroke } = pathsFor(hover, w, h)
    ctx.globalAlpha = 0.4
    ctx.fillStyle = look.hover
    ctx.fill(fill)
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = look.hover
    ctx.lineWidth = Math.max(1.6, w / 1800)
    ctx.stroke(stroke)
  }
  const { fill, stroke } = pathsFor(selected, w, h)
  ctx.globalAlpha = 1
  ctx.fillStyle = look.selected
  ctx.fill(fill)
  ctx.strokeStyle = look.outline
  ctx.lineWidth = Math.max(2.4, w / 1300)
  ctx.stroke(stroke)
}

function useCanvasTexture(width: number) {
  const gl = useThree(s => s.gl)
  const size = Math.min(width, gl.capabilities.maxTextureSize)
  const layer = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size / 2
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return { canvas, texture, w: canvas.width, h: canvas.height }
  }, [gl, size])
  useEffect(() => () => layer.texture.dispose(), [layer])
  return layer
}

// --- the sphere ----------------------------------------------------------------------------------------------

function Earth({ theme, compact, selected, hover, onPick, onHover, earthRef }: {
  theme: ThemeMode
  compact: boolean
  selected: string
  hover: string | null
  onPick: (e: ThreeEvent<MouseEvent>) => void
  onHover: (e: ThreeEvent<PointerEvent>) => void
  earthRef: React.RefObject<THREE.Mesh | null>
}) {
  const look = GLOBE_LOOK[theme]
  const width = compact ? 2048 : 4096
  const base = useCanvasTexture(width)
  const highlight = useCanvasTexture(width)
  const sun = useMemo(() => new THREE.Vector3(), [])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: mapFragment,
    uniforms: { uMap: { value: base.texture }, uRim: { value: new THREE.Color() }, uSun: { value: sun }, uNight: { value: 0.7 } },
  }), [base.texture, sun])

  useEffect(() => {
    material.uniforms.uRim.value.set(look.rim)
    material.uniforms.uNight.value = look.night
  }, [look, material])

  useEffect(() => {
    const ctx = base.canvas.getContext('2d')
    if (!ctx) return
    paintMap(ctx, base.w, base.h, look)
    base.texture.needsUpdate = true
  }, [base, look])

  useEffect(() => {
    const ctx = highlight.canvas.getContext('2d')
    if (!ctx) return
    paintHighlight(ctx, highlight.w, highlight.h, selected, hover, look)
    highlight.texture.needsUpdate = true
  }, [highlight, selected, hover, look])

  // the night half follows real UTC time
  useEffect(() => {
    const update = () => sun.set(...latLonToXYZ(...subsolarPoint(), 1))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [sun])

  return (
    <>
      <mesh ref={earthRef} material={material} onClick={onPick} onPointerMove={onHover} onPointerOut={onHover}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.006, 96, 96]} />
        <meshBasicMaterial map={highlight.texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

// --- the selected country when it has no outline in the border data (islands, microstates) --------------------

function CentroidMark({ latLon, color }: { latLon: LatLon; color: string }) {
  const position = useMemo(() => toVector(...latLon, EARTH_RADIUS + 0.01), [latLon])
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.035, 16, 16]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

// --- the station that is playing: a pin with a label ----------------------------------------------------------

function PlayingPin({ code, name, isPlaying, color, earthRef }: {
  code: string; name: string; isPlaying: boolean; color: string; earthRef: React.RefObject<THREE.Mesh | null>
}) {
  const latLon = centroidOf(code)
  const position = useMemo(() => (latLon ? toVector(...latLon, EARTH_RADIUS) : null), [latLon])
  const quaternion = useMemo(() => (position ? new THREE.Quaternion().setFromUnitVectors(Y_AXIS, position.clone().normalize()) : null), [position])
  if (!position || !quaternion) return null
  return (
    <group position={position} quaternion={quaternion}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 0.18, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Html position={[0, 0.27, 0]} center occlude={[earthRef as React.RefObject<THREE.Object3D>]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="flex max-w-[180px] items-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface-panel px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wide text-foreground shadow-panel">
          <EqBars playing={isPlaying} />
          <span className="truncate">{name}</span>
        </div>
      </Html>
    </group>
  )
}

// --- a thin arc from the previous country to the new one -------------------------------------------------------

function Arc({ from, to, color, onDone }: { from: LatLon; to: LatLon; color: string; onDone: () => void }) {
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const age = useRef(0)
  const geometry = useMemo(() => {
    const a = toVector(...from, 1)
    const b = toVector(...to, 1)
    const angle = a.angleTo(b)
    const rotation = new THREE.Quaternion().setFromUnitVectors(a, b)
    const step = new THREE.Quaternion()
    const points = Array.from({ length: 49 }, (_, i) => {
      const t = i / 48
      return a.clone().applyQuaternion(step.identity().slerp(rotation, t)).multiplyScalar(EARTH_RADIUS + 0.012 + Math.sin(Math.PI * t) * angle * 0.28)
    })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.006, 6, false)
  }, [from, to])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, dt) => {
    age.current += dt
    const drawn = Math.min(1, age.current / 0.9)
    geometry.setDrawRange(0, Math.floor(((geometry.index?.count ?? 0) * drawn) / 6) * 6)
    if (material.current) material.current.opacity = Math.max(0, age.current > 1.2 ? 1 - (age.current - 1.2) / 0.8 : 1)
    if (age.current > 2) onDone()
  })

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial ref={material} color={color} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// --- camera ----------------------------------------------------------------------------------------------------

const _cur = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _step = new THREE.Quaternion()

/** Orbit controls plus: fly-to, and fit-to-visible-area (above the bottom sheet). The globe never drifts on its own. */
function CameraRig({ focus, inset, reduceMotion }: { focus: { latLon: LatLon; key: number }; inset: number; reduceMotion: boolean }) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const size = useThree(s => s.size)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const flight = useRef<THREE.Vector3 | null>(null)
  const fitting = useRef(true)
  const fitDistance = useRef(7)
  const viewInset = useRef(inset)

  useEffect(() => {
    const t = Math.tan((camera.fov * Math.PI) / 360)
    const visibleHeight = Math.max(size.height - inset, 160)
    const byHeight = (GLOBE_DIAMETER * size.height) / (visibleHeight * 2 * t)
    const byWidth = GLOBE_DIAMETER / (2 * t * (size.width / size.height))
    fitDistance.current = Math.max(byHeight, byWidth, 4.6) * 1.04
    fitting.current = true
    if (controls.current) controls.current.maxDistance = Math.max(10, fitDistance.current * 1.5)
  }, [camera, size.width, size.height, inset])

  useEffect(() => {
    flight.current = toVector(...focus.latLon, 1)
    fitting.current = true
  }, [focus])

  useEffect(() => () => camera.clearViewOffset(), [camera])

  useFrame((_, delta) => {
    const ctrl = controls.current
    if (!ctrl) return
    const dt = Math.min(delta, 0.05)
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 3)

    // keep the globe centered in the area not covered by the sheet
    viewInset.current += (inset - viewInset.current) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 8))
    if (Math.abs(inset - viewInset.current) < 0.3) viewInset.current = inset
    camera.setViewOffset(size.width, size.height, 0, viewInset.current / 2, size.width, size.height)

    const target = flight.current
    if (target) {
      _cur.copy(camera.position).normalize()
      if (_cur.angleTo(target) < 0.005) flight.current = null
      else {
        _rotation.setFromUnitVectors(_cur, target)
        camera.position.applyQuaternion(_step.identity().slerp(_rotation, k))
      }
    }
    if (fitting.current) {
      const distance = camera.position.length()
      const next = distance + (fitDistance.current - distance) * k
      camera.position.setLength(next)
      if (Math.abs(next - fitDistance.current) < 0.02) fitting.current = false
    }

    ctrl.rotateSpeed = THREE.MathUtils.clamp((camera.position.length() - EARTH_RADIUS) * 0.16, 0.25, 0.8)
  }, -2) // before drei's controls.update() so orientation is resolved in the same frame

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.07}
      minDistance={EARTH_RADIUS + 1.1}
      onStart={() => { flight.current = null; fitting.current = false }}
    />
  )
}

// --- scene -----------------------------------------------------------------------------------------------------

export type GlobeSceneProps = {
  theme: ThemeMode
  countries: Country[]
  selectedCode: string
  focusKey: number
  playing: { code: string; name: string; isPlaying: boolean } | null
  bottomInset: number
  reduceMotion: boolean
  compact: boolean
  onSelectCountry: (code: string) => void
  onHover: (code: string | null, x: number, y: number) => void
}

export function GlobeScene({ theme, countries, selectedCode, focusKey, playing, bottomInset, reduceMotion, compact, onSelectCountry, onHover }: GlobeSceneProps) {
  const earthRef = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState<string | null>(null)
  const pin = GLOBE_LOOK[theme].pin

  const known = useMemo(() => new Set(countries.map(c => c.code)), [countries])
  const selectedLatLon = centroidOf(selectedCode)
  const focus = useMemo(() => ({ latLon: selectedLatLon ?? ([15, 100] as LatLon), key: focusKey }), [selectedLatLon, focusKey])

  const codeAt = (point: THREE.Vector3) => {
    const [lat, lon] = xyzToLatLon(point.x, point.y, point.z)
    const hit = findCountryAt(lat, lon)
    if (hit && (known.size === 0 || known.has(hit))) return hit
    return nearestCountry(lat, lon, known, 3)
  }

  const handleHover = (e: ThreeEvent<PointerEvent>) => {
    if (e.type === 'pointerout' || e.pointerType === 'touch') { setHover(null); onHover(null, 0, 0); return }
    const code = codeAt(e.point)
    setHover(prev => (prev === code ? prev : code))
    onHover(code, e.clientX, e.clientY)
  }

  const handlePick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return // it was a drag
    const code = codeAt(e.point)
    if (!code) return
    e.stopPropagation()
    navigator.vibrate?.(8)
    onSelectCountry(code)
  }

  // a flying arc from the previous country to the new one
  const [arc, setArc] = useState<{ id: number; from: LatLon; to: LatLon } | null>(null)
  const previous = useRef(selectedCode)
  useEffect(() => {
    const from = centroidOf(previous.current)
    const to = centroidOf(selectedCode)
    previous.current = selectedCode
    if (from && to && !reduceMotion && from !== to) setArc(a => ({ id: (a?.id ?? 0) + 1, from, to }))
  }, [selectedCode, reduceMotion])

  const pinLatLon = playing ? centroidOf(playing.code) : undefined

  return (
    <>
      <CameraRig focus={focus} inset={bottomInset} reduceMotion={reduceMotion} />
      <Earth theme={theme} compact={compact} selected={selectedCode} hover={hover} onPick={handlePick} onHover={handleHover} earthRef={earthRef} />
      {selectedLatLon && !hasBorder(selectedCode) && <CentroidMark latLon={selectedLatLon} color={pin} />}
      {playing && pinLatLon && <PlayingPin code={playing.code} name={playing.name} isPlaying={playing.isPlaying} color={pin} earthRef={earthRef} />}
      {arc && <Arc key={arc.id} from={arc.from} to={arc.to} color={pin} onDone={() => setArc(null)} />}
    </>
  )
}
