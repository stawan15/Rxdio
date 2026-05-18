import { useRef, useMemo, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Sphere, Html, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { RadioStation } from '../services/radioApi'
import { accentHex, type ThemeMode } from '../theme'
import { cn } from '../lib/cn'

const COUNTRY_NODES = [
  { name: 'Thailand', lat: 15.87, lon: 100.99 },
  { name: 'USA', lat: 37.09, lon: -95.71 },
  { name: 'Japan', lat: 36.20, lon: 138.25 },
  { name: 'Germany', lat: 51.16, lon: 10.45 },
  { name: 'UK', lat: 55.37, lon: -3.43 },
  { name: 'Brazil', lat: -14.23, lon: -51.92 },
  { name: 'Australia', lat: -25.27, lon: 133.77 },
  { name: 'India', lat: 20.59, lon: 78.96 },
  { name: 'France', lat: 46.22, lon: 2.21 },
  { name: 'South Korea', lat: 35.90, lon: 127.76 },
  { name: 'Russia', lat: 61.52, lon: 105.31 },
  { name: 'Canada', lat: 56.13, lon: -106.34 },
  { name: 'China', lat: 35.86, lon: 104.19 },
  { name: 'Italy', lat: 41.87, lon: 12.56 },
  { name: 'Spain', lat: 40.46, lon: -3.74 },
  { name: 'Mexico', lat: 23.63, lon: -102.55 },
  { name: 'South Africa', lat: -30.55, lon: 22.93 },
  { name: 'Argentina', lat: -38.41, lon: -63.61 },
  { name: 'Egypt', lat: 26.82, lon: 30.80 },
  { name: 'Turkey', lat: 38.96, lon: 35.24 },
  { name: 'Norway', lat: 60.47, lon: 8.46 },
  { name: 'New Zealand', lat: -40.90, lon: 174.88 },
]

const getNormal = (pos: THREE.Vector3) => pos.clone().normalize()

const convertTo3D = (lat: number, lon: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

type Props = {
  onSelectCountry: (name: string) => void
  themeMode: ThemeMode
  selectedStation: RadioStation | null
}

export function Globe({ onSelectCountry, themeMode, selectedStation }: Props) {
  const worldRef = useRef<THREE.Group>(null!)
  const cloudsRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState<string | null>(null)

  const isDark = themeMode === 'dark'
  const isPink = themeMode === 'pink'
  const markerColor = accentHex(themeMode)

  const [colorMap, bumpMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
  ])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    if (worldRef.current) worldRef.current.rotation.y += isPink ? 0.0004 : 0.0006
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0008

    state.scene.traverse((obj) => {
      if ((obj.name === 'country-beam' || obj.name === 'country-tip') && obj instanceof THREE.Mesh) {
        const selected = obj.userData.selected
        if (obj.material instanceof THREE.MeshBasicMaterial) {
          obj.material.opacity = selected ? 0.9 : 0.35 + Math.sin(time * 3) * 0.12
        }
      }
      if (obj.name === 'country-core') {
        const selected = obj.userData.selected
        const base = selected ? 1.5 : 1
        obj.scale.setScalar(base + Math.sin(time * 5) * 0.1)
      }
    })
  })

  const markers = useMemo(() =>
    COUNTRY_NODES.map(node => {
      const position = convertTo3D(node.lat, node.lon, 2.01)
      const quaternion = new THREE.Quaternion()
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), getNormal(position))
      return { ...node, position, quaternion }
    }), [])

  return (
    <>
      <ambientLight intensity={isDark ? 0.3 : isPink ? 0.9 : 1} />
      <directionalLight position={[5, 8, 5]} intensity={isDark ? 1.5 : isPink ? 1.3 : 2.5} color={isPink ? '#ffe9f0' : '#ffffff'} />
      {isPink && (
        <>
          <pointLight position={[-5, 4, 6]} intensity={0.7} color="#ff98c9" />
          <pointLight position={[4, -2, 3]} intensity={0.4} color="#ffd4e1" />
          <hemisphereLight args={['#ffe8f1', '#341b2d', 0.35]} />
        </>
      )}

      {isDark && (
        <Stars radius={150} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      )}
      {isPink && (
        <Stars radius={120} depth={40} count={900} factor={2.5} saturation={0.8} fade speed={0.4} />
      )}

      <group ref={worldRef}>
        {isPink && (
          <Sphere args={[1.12, 64, 64]} scale={2.12}>
            <meshBasicMaterial
              color="#ffbfd5"
              transparent
              opacity={0.14}
              blending={THREE.AdditiveBlending}
              side={THREE.BackSide}
            />
          </Sphere>
        )}

        <Sphere args={[1, 64, 64]} scale={2}>
          <meshPhysicalMaterial
            map={colorMap}
            bumpMap={bumpMap}
            bumpScale={isPink ? 0.06 : 0.05}
            color={isPink ? '#ffbfd6' : '#ffffff'}
            emissive={isPink ? new THREE.Color('#ffdae6') : new THREE.Color('#000000')}
            emissiveIntensity={isPink ? 0.24 : 0}
            roughness={isPink ? 0.35 : 0.6}
            metalness={isPink ? 0.05 : 0}
            clearcoat={isPink ? 0.4 : 0}
            clearcoatRoughness={isPink ? 0.25 : 0}
            envMapIntensity={isPink ? 0.8 : 1}
          />
        </Sphere>

        <Sphere ref={cloudsRef} args={[1.012, 64, 64]} scale={2.02}>
          <meshStandardMaterial
            color={isPink ? '#fff5f8' : '#ffffff'}
            transparent
            opacity={isPink ? 0.22 : 0.15}
            roughness={1}
            metalness={0}
            side={THREE.DoubleSide}
          />
        </Sphere>

        {isPink && (
          <Sphere args={[1.09, 64, 64]} scale={2.06}>
            <meshBasicMaterial
              color="#ffd9e8"
              transparent
              opacity={0.08}
              blending={THREE.AdditiveBlending}
              side={THREE.FrontSide}
            />
          </Sphere>
        )}

        {markers.map(marker => {
          const isSelected = selectedStation?.country === marker.name
          const coreSize = isPink ? 0.022 : 0.015
          return (
            <group
              key={marker.name}
              position={marker.position}
              quaternion={marker.quaternion}
              onClick={e => { e.stopPropagation(); onSelectCountry(marker.name) }}
              onPointerOver={() => setHovered(marker.name)}
              onPointerOut={() => setHovered(null)}
            >
              <mesh name="country-core" userData={{ selected: isSelected }}>
                <sphereGeometry args={[coreSize, 16, 16]} />
                <meshBasicMaterial color={isSelected ? '#fff' : markerColor} />
              </mesh>
              {!isPink && (
                <>
                  <mesh name="country-beam" position={[0, 0.08, 0]} userData={{ selected: isSelected }}>
                    <cylinderGeometry args={[0.002, 0.002, 0.16, 8]} />
                    <meshBasicMaterial color={markerColor} transparent opacity={0.3} />
                  </mesh>
                  <mesh name="country-tip" position={[0, 0.16, 0]} userData={{ selected: isSelected }}>
                    <sphereGeometry args={[0.008, 16, 16]} />
                    <meshBasicMaterial color={isSelected ? '#fff' : markerColor} transparent opacity={0.6} />
                  </mesh>
                </>
              )}

              {hovered === marker.name && (
                <Html distanceFactor={10}>
                  <div
                    className={cn(
                      'pointer-events-none flex -translate-x-1/2 -translate-y-[140%] flex-col gap-1.5 whitespace-nowrap px-4 py-3 text-[11px] font-semibold shadow-panel',
                      isPink ? 'rounded-2xl border-2 border-accent bg-white text-foreground' : 'rounded-sm border border-white/10 bg-black/95 text-white',
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">♡ Location</span>
                      {isSelected && (
                        <span className="text-[9px] font-bold" style={{ color: markerColor }}>● On air</span>
                      )}
                    </div>
                    <span className="text-sm font-bold">{marker.name}</span>
                    {isSelected && selectedStation && (
                      <div className="border-t border-border pt-1.5">
                        <span className="text-[10px] opacity-60">{selectedStation.name}</span>
                      </div>
                    )}
                  </div>
                </Html>
              )}
            </group>
          )
        })}
      </group>

      <OrbitControls enablePan={false} enableZoom minDistance={3} maxDistance={10} />
    </>
  )
}
