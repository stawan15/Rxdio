import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react'
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { BORDERS, centroidOf, findCountryAt, latLonToXYZ, nearestCountry, xyzToLatLon, type LatLon } from '../../lib/geo'
import { subsolarPoint } from '../../lib/sun'
import { accentHex, GLOBE_LOOK, type ThemeMode } from '../../theme'
import type { Country } from '../../services/radioApi'
import { EqBars } from '../EqBars'
import { atmosphereFragment, earthFragment, vertex } from './shaders'

const EARTH_RADIUS = 2
const GLOBE_DIAMETER = 4.5 // earth + atmosphere, used to fit the camera
const OVERLAY_W = 2048
const OVERLAY_H = 1024
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

const toVector = (lat: number, lon: number, radius: number) => new THREE.Vector3(...latLonToXYZ(lat, lon, radius))
const upQuaternion = (normal: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(Y_AXIS, normal)

// --- country borders, painted into an equirectangular canvas that wraps the globe -----------------------------

const borderPaths = new Map<string, Path2D>()
let allBorders: Path2D | null = null

function pathsFor() {
  if (!allBorders) {
    allBorders = new Path2D()
    for (const { code, rings } of BORDERS) {
      const path = new Path2D()
      for (const ring of rings) {
        ring.forEach(([lon, lat], i) => {
          const x = ((lon + 180) / 360) * OVERLAY_W
          const y = ((90 - lat) / 180) * OVERLAY_H
          if (i === 0) path.moveTo(x, y)
          else path.lineTo(x, y)
        })
        path.closePath()
      }
      borderPaths.set(code, path)
      allBorders.addPath(path)
    }
  }
  return { all: allBorders, byCode: borderPaths }
}

function paintOverlay(ctx: CanvasRenderingContext2D, selected: string, hover: string | null, accent: string, line: string) {
  const { all, byCode } = pathsFor()
  ctx.clearRect(0, 0, OVERLAY_W, OVERLAY_H)
  ctx.lineJoin = 'round'
  ctx.strokeStyle = line
  ctx.globalAlpha = 0.28
  ctx.lineWidth = 1.4
  ctx.stroke(all)

  const highlight = (code: string | null, fill: number, width: number) => {
    const path = code ? byCode.get(code) : undefined
    if (!path) return
    ctx.fillStyle = accent
    ctx.strokeStyle = accent
    ctx.globalAlpha = fill
    ctx.fill(path)
    ctx.globalAlpha = 1
    ctx.lineWidth = width
    ctx.stroke(path)
  }
  if (hover && hover !== selected) highlight(hover, 0.2, 2)
  highlight(selected, 0.34, 3.5)
  ctx.globalAlpha = 1
}

// --- Earth, clouds, atmosphere ---------------------------------------------------------------------------------

function Earth({ theme, selected, hover, onPick, onHover, earthRef }: {
  theme: ThemeMode
  selected: string
  hover: string | null
  onPick: (e: ThreeEvent<MouseEvent>) => void
  onHover: (e: ThreeEvent<PointerEvent>) => void
  earthRef: React.RefObject<THREE.Mesh | null>
}) {
  const gl = useThree(s => s.gl)
  const clouds = useRef<THREE.Mesh>(null)
  const look = GLOBE_LOOK[theme]
  const accent = accentHex(theme)

  const [day, night, cloudMap] = useTexture(
    ['/textures/earth_atmos_2048.jpg', '/textures/earth_lights_2048.png', '/textures/earth_clouds_1024.png'],
    textures => [textures].flat().forEach(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8 }),
  )

  const sun = useMemo(() => new THREE.Vector3(), [])
  const sunLight = useRef<THREE.DirectionalLight>(null)
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: earthFragment,
    uniforms: {
      uDay: { value: day }, uNight: { value: night }, uSun: { value: sun },
      uTint: { value: new THREE.Color() }, uLights: { value: new THREE.Color() },
      uAtmosphere: { value: new THREE.Color() }, uAmbient: { value: 0 },
    },
  }), [day, night, sun])
  const atmosphere = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: atmosphereFragment,
    uniforms: { uColor: { value: new THREE.Color() }, uSun: { value: sun } },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [sun])

  useEffect(() => {
    const u = material.uniforms
    u.uTint.value.set(look.tint)
    u.uLights.value.set(look.lights)
    u.uAtmosphere.value.set(look.atmosphere)
    u.uAmbient.value = look.ambient
    atmosphere.uniforms.uColor.value.set(look.atmosphere)
  }, [look, material, atmosphere])

  // the sun follows real UTC time
  useEffect(() => {
    const update = () => {
      sun.set(...latLonToXYZ(...subsolarPoint(), 1))
      sunLight.current?.position.copy(sun).multiplyScalar(10)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [sun])

  const overlay = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = OVERLAY_W
    canvas.height = OVERLAY_H
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    return { canvas, texture }
  }, [gl])

  useEffect(() => {
    const ctx = overlay.canvas.getContext('2d')
    if (!ctx) return
    paintOverlay(ctx, selected, hover, accent, look.borders)
    overlay.texture.needsUpdate = true
  }, [overlay, selected, hover, accent, look.borders])

  useFrame((_, dt) => { if (clouds.current) clouds.current.rotation.y += dt * 0.004 })

  return (
    <>
      <ambientLight intensity={look.ambient * 0.6} />
      <directionalLight ref={sunLight} intensity={2.2} />
      <mesh ref={earthRef} material={material} onClick={onPick} onPointerMove={onHover} onPointerOut={onHover}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.004, 96, 96]} />
        <meshBasicMaterial map={overlay.texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={clouds}>
        <sphereGeometry args={[EARTH_RADIUS + 0.03, 64, 64]} />
        <meshLambertMaterial map={cloudMap} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh material={atmosphere}>
        <sphereGeometry args={[EARTH_RADIUS + 0.28, 64, 64]} />
      </mesh>
    </>
  )
}

// --- markers, ripples, pin, arc --------------------------------------------------------------------------------

type Marker = { code: string; position: THREE.Vector3; size: number; phase: number }

function Markers({ markers, selected, hover, accent }: { markers: Marker[]; selected: string; hover: string | null; accent: string }) {
  const dots = useRef<THREE.InstancedMesh>(null)
  const halos = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    const base = new THREE.Color(accent)
    const white = new THREE.Color('#ffffff')
    markers.forEach((m, i) => {
      dots.current?.setColorAt(i, m.code === selected ? white : base)
      halos.current?.setColorAt(i, base)
    })
    for (const mesh of [dots.current, halos.current]) if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [markers, selected, accent])

  useFrame(({ clock }) => {
    if (!dots.current || !halos.current) return
    const t = clock.elapsedTime
    markers.forEach((m, i) => {
      const scale = m.size * (m.code === selected ? 1.9 : m.code === hover ? 1.5 : 1)
      dummy.position.copy(m.position)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      dots.current?.setMatrixAt(i, dummy.matrix)
      dummy.scale.setScalar(scale * 1.8 * (1 + 0.3 * Math.sin(t * 2 + m.phase)))
      dummy.updateMatrix()
      halos.current?.setMatrixAt(i, dummy.matrix)
    })
    dots.current.instanceMatrix.needsUpdate = true
    halos.current.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh key={`d${markers.length}`} ref={dots} args={[undefined, undefined, markers.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh key={`h${markers.length}`} ref={halos} args={[undefined, undefined, markers.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
    </>
  )
}

function Ripples({ latLon, color }: { latLon: LatLon; color: string }) {
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const position = useMemo(() => toVector(...latLon, EARTH_RADIUS + 0.01), [latLon])
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Z_AXIS, position.clone().normalize()), [position])
  useFrame(({ clock }) => {
    rings.current.forEach((ring, i) => {
      if (!ring) return
      const p = (clock.elapsedTime * 0.45 + i / 3) % 1
      ring.scale.setScalar(0.03 + p * 0.24)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.75
    })
  })
  return (
    <group position={position} quaternion={quaternion}>
      {[0, 1, 2].map(i => (
        <mesh key={i} ref={el => { rings.current[i] = el }}>
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function PlayingPin({ code, name, isPlaying, color, earthRef }: {
  code: string; name: string; isPlaying: boolean; color: string; earthRef: React.RefObject<THREE.Mesh | null>
}) {
  const latLon = centroidOf(code)
  const position = useMemo(() => (latLon ? toVector(...latLon, EARTH_RADIUS) : null), [latLon])
  if (!position) return null
  return (
    <group position={position} quaternion={upQuaternion(position.clone().normalize())}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.2, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <sphereGeometry args={[0.028, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Html position={[0, 0.28, 0]} center occlude={[earthRef as React.RefObject<THREE.Object3D>]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="flex max-w-[180px] items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface-panel px-3 py-1.5 text-xs font-semibold text-foreground shadow-panel backdrop-blur-md">
          <EqBars playing={isPlaying} />
          <span className="truncate">{name}</span>
        </div>
      </Html>
    </group>
  )
}

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
      return a.clone().applyQuaternion(step.identity().slerp(rotation, t)).multiplyScalar(EARTH_RADIUS + 0.01 + Math.sin(Math.PI * t) * angle * 0.28)
    })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.007, 6, false)
  }, [from, to])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, dt) => {
    age.current += dt
    const drawn = Math.min(1, age.current / 0.9)
    geometry.setDrawRange(0, Math.floor((geometry.index?.count ?? 0) * drawn / 6) * 6)
    if (material.current) material.current.opacity = Math.max(0, age.current > 1.2 ? 1 - (age.current - 1.2) / 0.8 : 1) * 0.9
    if (age.current > 2) onDone()
  })

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial ref={material} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  )
}

// --- camera ----------------------------------------------------------------------------------------------------

const _cur = new THREE.Vector3()
const _rotation = new THREE.Quaternion()
const _step = new THREE.Quaternion()

/** Orbit controls plus: fly-to, fit-to-visible-area (above the bottom sheet), idle auto-rotate. */
function CameraRig({ focus, inset, reduceMotion }: { focus: { latLon: LatLon; key: number }; inset: number; reduceMotion: boolean }) {
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera
  const size = useThree(s => s.size)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const flight = useRef<THREE.Vector3 | null>(null)
  const fitting = useRef(true)
  const fitDistance = useRef(7)
  const viewInset = useRef(inset)
  const lastInput = useRef(performance.now())

  useEffect(() => {
    const t = Math.tan((camera.fov * Math.PI) / 360)
    const visibleHeight = Math.max(size.height - inset, 160)
    const byHeight = (GLOBE_DIAMETER * size.height) / (visibleHeight * 2 * t)
    const byWidth = GLOBE_DIAMETER / (2 * t * (size.width / size.height))
    fitDistance.current = Math.max(byHeight, byWidth, 4.6) * 1.08
    fitting.current = true
    if (controls.current) controls.current.maxDistance = Math.max(10, fitDistance.current * 1.5)
  }, [camera, size.width, size.height, inset])

  useEffect(() => {
    flight.current = toVector(...focus.latLon, 1)
    fitting.current = true
    lastInput.current = performance.now()
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
    ctrl.autoRotate = !reduceMotion && !flight.current && performance.now() - lastInput.current > 6000
  }, -2) // before drei's controls.update() so orientation is resolved in the same frame

  const touch = () => { flight.current = null; fitting.current = false; lastInput.current = performance.now() }

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.07}
      minDistance={EARTH_RADIUS + 1.1}
      autoRotateSpeed={0.35}
      onStart={touch}
      onEnd={() => { lastInput.current = performance.now() }}
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
  const accent = accentHex(theme)
  const look = GLOBE_LOOK[theme]

  const known = useMemo(() => new Set(countries.map(c => c.code)), [countries])
  const markers = useMemo<Marker[]>(() => countries.flatMap(c => {
    const latLon = centroidOf(c.code)
    if (!latLon) return []
    return [{ code: c.code, position: toVector(...latLon, EARTH_RADIUS + 0.006), size: 0.011 + Math.min(Math.log10(c.stationcount + 1) * 0.008, 0.026), phase: (c.code.charCodeAt(0) * 7 + c.code.charCodeAt(1)) % 6.28 }]
  }), [countries])

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
      {look.stars > 0 && <Stars radius={90} depth={50} count={compact ? look.stars / 2.5 : look.stars} factor={4} saturation={0} fade speed={reduceMotion ? 0 : 1} />}
      <Earth theme={theme} selected={selectedCode} hover={hover} onPick={handlePick} onHover={handleHover} earthRef={earthRef} />
      <Markers markers={markers} selected={selectedCode} hover={hover} accent={accent} />
      {selectedLatLon && !reduceMotion && <Ripples latLon={selectedLatLon} color={accent} />}
      {playing && pinLatLon && <PlayingPin code={playing.code} name={playing.name} isPlaying={playing.isPlaying} color={accent} earthRef={earthRef} />}
      {arc && <Arc key={arc.id} from={arc.from} to={arc.to} color={accent} onDone={() => setArc(null)} />}
    </>
  )
}
