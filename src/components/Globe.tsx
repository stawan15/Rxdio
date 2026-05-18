import { useRef, useMemo, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Sphere, Html, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { RadioStation } from '../services/radioApi'
import { accentHex, bunny, type ThemeMode } from '../theme'

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

  const [colorMap, bumpMap, specularMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
  ])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    if (worldRef.current) worldRef.current.rotation.y += 0.0006
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0008

    state.scene.traverse((obj) => {
      if ((obj.name === 'country-beam' || obj.name === 'country-tip') && obj instanceof THREE.Mesh) {
        const selected = obj.userData.selected
        if (obj.material instanceof THREE.MeshBasicMaterial) {
          obj.material.opacity = selected ? 0.9 : 0.3 + Math.sin(time * 3) * 0.1
        }
      }
      if (obj.name === 'country-core') {
        const selected = obj.userData.selected
        const base = selected ? 1.4 : 1
        obj.scale.setScalar(base + Math.sin(time * 5) * 0.08)
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
      <ambientLight intensity={isDark ? 0.3 : isPink ? 0.72 : 1} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={isDark ? 1.5 : isPink ? 1.9 : 2.5}
        color={isPink ? bunny.pink : '#ffffff'}
      />

      {(isDark || isPink) && (
        <Stars radius={150} depth={50} count={5000} factor={4} saturation={isPink ? 0.35 : 0} fade speed={1} />
      )}

      <group ref={worldRef}>
        <Sphere args={[1, 64, 64]} scale={2}>
          <meshPhongMaterial
            map={colorMap}
            bumpMap={bumpMap}
            bumpScale={0.05}
            specularMap={specularMap}
            specular={new THREE.Color('grey')}
            shininess={10}
          />
        </Sphere>

        <Sphere ref={cloudsRef} args={[1.005, 64, 64]} scale={2.02}>
          <meshPhongMaterial color="#ffffff" transparent opacity={0.15} side={THREE.DoubleSide} />
        </Sphere>

        {markers.map(marker => {
          const isSelected = selectedStation?.country === marker.name
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
                <sphereGeometry args={[0.015, 16, 16]} />
                <meshBasicMaterial color={isSelected ? '#fff' : markerColor} />
              </mesh>
              <mesh name="country-beam" position={[0, 0.08, 0]} userData={{ selected: isSelected }}>
                <cylinderGeometry args={[0.002, 0.002, 0.16, 8]} />
                <meshBasicMaterial color={markerColor} transparent opacity={0.3} />
              </mesh>
              <mesh name="country-tip" position={[0, 0.16, 0]} userData={{ selected: isSelected }}>
                <sphereGeometry args={[0.008, 16, 16]} />
                <meshBasicMaterial color={isSelected ? '#fff' : markerColor} transparent opacity={0.6} />
              </mesh>

              {hovered === marker.name && (
                <Html distanceFactor={10}>
                  <div
                    className="pointer-events-none flex -translate-x-1/2 -translate-y-[140%] flex-col gap-2 whitespace-nowrap rounded-sm border px-4 py-3 text-[11px] font-medium shadow-panel"
                    style={{
                      background: isPink ? bunny.light : 'rgba(0,0,0,0.95)',
                      color: isPink ? bunny.dark : '#fff',
                      borderColor: isPink ? bunny.pink : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-5">
                      <span className="font-sans text-[9px] uppercase tracking-[0.15em] opacity-40">Location</span>
                      {isSelected && (
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: markerColor }}>
                          ● Online
                        </span>
                      )}
                    </div>
                    <span className="font-sans text-sm font-semibold tracking-wide">{marker.name}</span>
                    {isSelected && selectedStation && (
                      <div className="flex flex-col gap-0.5 border-t border-black/5 pt-2">
                        <span className="text-[9px] uppercase tracking-widest opacity-30">Broadcasting</span>
                        <span className="text-[11px] font-medium" style={{ color: markerColor }}>{selectedStation.name}</span>
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
