import { useRef, useMemo, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Sphere, Html, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { RadioStation } from '../services/radioApi'

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

// Calculate normal vector for rotation
const getNormal = (pos: THREE.Vector3) => {
  return pos.clone().normalize()
}

// สูตรคำนวณพิกัด 3D ให้ตรงกับ Texture ของ Three.js
const convertTo3D = (lat: number, lon: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

export function Globe({ onSelectCountry, isDarkMode, selectedStation }: { 
  onSelectCountry: (name: string) => void, 
  isDarkMode?: boolean,
  selectedStation: RadioStation | null
}) {
  const worldRef = useRef<THREE.Group>(null!)
  const cloudsRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState<string | null>(null)

  const [colorMap, bumpMap, specularMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'
  ])

  // Animation loop
  useFrame((state) => {
    const time = state.clock.elapsedTime
    if (worldRef.current) worldRef.current.rotation.y += 0.0006
    if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0008
    
    state.scene.traverse((obj) => {
      if ((obj.name === 'country-beam' || obj.name === 'country-tip') && obj instanceof THREE.Mesh) {
        const isSelected = obj.userData.selected
        if (obj.material instanceof THREE.MeshBasicMaterial) {
          obj.material.opacity = isSelected ? 0.9 : 0.3 + Math.sin(time * 3) * 0.1
        }
      }
      if (obj.name === 'country-core') {
        const isSelected = obj.userData.selected
        const baseScale = isSelected ? 1.4 : 1
        obj.scale.setScalar(baseScale + Math.sin(time * 5) * 0.08)
      }
    })
  })

  const markers = useMemo(() => {
    return COUNTRY_NODES.map(node => {
      const position = convertTo3D(node.lat, node.lon, 2.01)
      const normal = getNormal(position)
      
      // Create a quaternion to rotate the cylinder to face outward
      const quaternion = new THREE.Quaternion()
      const up = new THREE.Vector3(0, 1, 0)
      quaternion.setFromUnitVectors(up, normal)

      return {
        ...node,
        position,
        quaternion
      }
    })
  }, [])

  return (
    <>
      <ambientLight intensity={isDarkMode ? 0.3 : 1} />
      <directionalLight position={[10, 10, 5]} intensity={isDarkMode ? 1.5 : 2.5} />
      
      {isDarkMode && <Stars radius={150} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      
      {/* กลุ่มของโลกที่หมุนไปพร้อมกัน */}
      <group ref={worldRef}>
        {/* Earth Body */}
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

        {/* Clouds */}
        <Sphere ref={cloudsRef} args={[1.005, 64, 64]} scale={2.02}>
          <meshPhongMaterial
            color="#ffffff"
            transparent={true}
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </Sphere>

        {/* Markers inside the same rotating group */}
        {markers.map((marker) => (
          <group 
            key={marker.name} 
            position={marker.position}
            quaternion={marker.quaternion}
            onClick={(e) => {
              e.stopPropagation()
              onSelectCountry(marker.name)
            }}
            onPointerOver={() => setHovered(marker.name)}
            onPointerOut={() => setHovered(null)}
          >
            {/* Base Core Dot */}
            <mesh 
              name="country-core" 
              userData={{ selected: selectedStation?.country === marker.name }}
            >
              <sphereGeometry args={[0.015, 16, 16]} />
              <meshBasicMaterial color={selectedStation?.country === marker.name ? "#fff" : "#00ff88"} />
            </mesh>

            {/* Transmission Beam */}
            <mesh 
              name="country-beam"
              position={[0, 0.08, 0]} // Shift up half height
              userData={{ selected: selectedStation?.country === marker.name }}
            >
              <cylinderGeometry args={[0.002, 0.002, 0.16, 8]} />
              <meshBasicMaterial color="#00ff88" transparent={true} opacity={0.3} />
            </mesh>

            {/* Antenna Tip */}
            <mesh 
              name="country-tip"
              position={[0, 0.16, 0]} // Shift to top of beam
              userData={{ selected: selectedStation?.country === marker.name }}
            >
              <sphereGeometry args={[0.008, 16, 16]} />
              <meshBasicMaterial color={selectedStation?.country === marker.name ? "#fff" : "#00ff88"} transparent={true} opacity={0.6} />
            </mesh>
            
            {hovered === marker.name && (
              <Html distanceFactor={10}>
                <div style={{
                  background: 'rgba(0,0,0,0.95)',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: '2px', // Sharp corners for formal look
                  fontSize: '11px',
                  fontWeight: '500',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                  transform: 'translate(-50%, -140%)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                    <span style={{ 
                      fontSize: '9px', letterSpacing: '0.15em', opacity: 0.4, 
                      textTransform: 'uppercase', fontFamily: '"Space Grotesk", sans-serif' 
                    }}>Location</span>
                    {selectedStation?.country === marker.name && (
                      <span style={{ 
                        fontSize: '9px', color: '#00ff88', letterSpacing: '0.1em', 
                        fontWeight: 700, textTransform: 'uppercase'
                      }}>● Online</span>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: '14px', letterSpacing: '0.02em', fontWeight: 600,
                    fontFamily: '"Space Grotesk", sans-serif'
                  }}>{marker.name}</div>
                  
                  {selectedStation?.country === marker.name && (
                    <div style={{ 
                      display: 'flex', flexDirection: 'column', gap: '2px',
                      borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px'
                    }}>
                      <span style={{ fontSize: '9px', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Broadcasting</span>
                      <span style={{ color: '#00ff88', fontSize: '11px', fontWeight: 500 }}>{selectedStation.name}</span>
                    </div>
                  )}
                </div>
              </Html>
            )}
          </group>
        ))}
      </group>

      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={3} 
        maxDistance={10} 
      />
    </>
  )
}
