'use client';
// components/three/GlobeScene/index.tsx — Three.js globe hero

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { latLngToVector3 } from '@/lib/geo/utils';

// Suppress THREE.Clock deprecation warnings originating from @react-three/fiber internals in Three.js v184+
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const firstArg = args[0];
    if (
      firstArg &&
      typeof firstArg === 'string' &&
      (firstArg.includes('THREE.Clock: This module has been deprecated') ||
        (firstArg.includes('THREE.Clock') && firstArg.includes('deprecated')))
    ) {
      return;
    }
    originalWarn(...args);
  };
}

// ─── Atmosphere Shader ────────────────────────────────────────────────────────
const atmVertShader = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const atmFragShader = `
varying vec3 vNormal;
uniform vec3  uColor;
uniform float uIntensity;
void main() {
  float rim = 1.0 - dot(normalize(vNormal), normalize(vec3(0.0, 0.0, 1.0)));
  float atm = pow(rim, 3.0) * uIntensity;
  gl_FragColor = vec4(uColor, atm);
}`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface GlobeSceneProps {
  catPoints?: Array<{ lat: number; lng: number }>;
  eventPoints?: Array<{ lat: number; lng: number }>;
  onNewPoint?: (lat: number, lng: number) => void;
}

// ─── Earth Sphere ─────────────────────────────────────────────────────────────
function EarthSphere() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load('/textures/earth-night.jpg');
  }, []);

  return (
    <>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive={new THREE.Color('#ffcc99')}
          emissiveIntensity={2.8}
          roughness={0.7}
          metalness={0.15}
        />
      </mesh>
      {/* Cozy Sand/Gold Coordinate Grid Lines */}
      <mesh>
        <sphereGeometry args={[1.004, 32, 32]} />
        <meshBasicMaterial
          color="#dbc2b2"
          wireframe
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// ─── Atmospheric Rim ──────────────────────────────────────────────────────────
function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmVertShader,
        fragmentShader: atmFragShader,
        uniforms: {
          uColor: { value: new THREE.Color('#006a63') }, // Cozy Emerald Teal glow base
          uIntensity: { value: 1.4 },
        },
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const updateColor = () => {
      const theme = document.documentElement.getAttribute('data-theme') || 'light';
      const colorHex = theme === 'light' ? '#f28c38' : '#006a63'; // Warm Sunlit Amber vs Cozy Emerald Teal
      material.uniforms.uColor.value.set(colorHex);
    };

    updateColor();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-theme') {
          updateColor();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, [material]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ─── Cat Density Particles (InstancedMesh) ────────────────────────────────────
const MAX_PARTICLES = 1000;

function CatParticles({ catPoints }: { catPoints: Array<{ lat: number; lng: number }> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const time = useRef(0);

  const geometry = useMemo(() => new THREE.SphereGeometry(0.015, 8, 8), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#006a63'), // Deep emerald base
        emissive: new THREE.Color('#00bfa5'), // Glowing mint/teal lights
        emissiveIntensity: 2.5,
        roughness: 0.1,
      }),
    [],
  );

  useEffect(() => {
    if (!meshRef.current) return;
    const points = catPoints.length > 0 ? catPoints : generatePawPrintPlaceholders();
    const count = Math.min(points.length, MAX_PARTICLES);
    meshRef.current.count = count;

    for (let i = 0; i < count; i++) {
      const v = latLngToVector3(points[i].lat, points[i].lng, 1.01);
      dummy.position.set(v.x, v.y, v.z);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [catPoints, dummy]);

  useFrame((_, delta) => {
    time.current += delta;
    if (!meshRef.current) return;
    // Elegant twinkling scale animation
    const scale = 1.0 + 0.15 * Math.sin(time.current * 4.5);
    meshRef.current.scale.setScalar(scale);
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <instancedMesh ref={meshRef} args={[geometry, material, MAX_PARTICLES]} />;
}

// ─── Single Aligned Pulsing Event Ring ────────────────────────────────────────
function SingleEventRing({ lat, lng, delay = 0 }: { lat: number; lng: number; delay?: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const position = useMemo(() => latLngToVector3(lat, lng, 1.015), [lat, lng]);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime() + delay;
    const progress = (elapsed % 2) / 2; // 0 to 1 loop every 2s

    if (meshRef.current) {
      meshRef.current.scale.setScalar(0.2 + progress * 2.2);
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.85 * (1 - progress);
      }
    }
  });

  useEffect(() => {
    if (meshRef.current) {
      // Orient the ring perpendicular to the sphere surface
      meshRef.current.lookAt(position.clone().multiplyScalar(2));
    }
  }, [position]);

  return (
    <mesh ref={meshRef} position={position}>
      <ringGeometry args={[0.01, 0.035, 32]} />
      <meshBasicMaterial
        color="#f28c38" // Warm sunset terracotta/amber
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── TNR Event Rings Group ────────────────────────────────────────────────────
function EventRings({ eventPoints }: { eventPoints: Array<{ lat: number; lng: number }> }) {
  const points = useMemo(() => {
    return eventPoints.length > 0 ? eventPoints.slice(0, 30) : [];
  }, [eventPoints]);

  return (
    <group>
      {points.map((pt, i) => (
        <SingleEventRing key={i} lat={pt.lat} lng={pt.lng} delay={i * 0.25} />
      ))}
    </group>
  );
}

// ─── Globe Scene Root ─────────────────────────────────────────────────────────
function GlobeInner({ catPoints = [], eventPoints = [] }: GlobeSceneProps) {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    if (!gl.capabilities.isWebGL2) {
      console.warn('WebGL2 not available — falling back');
    }
  }, [gl]);

  // Slowly rotate the globe automatically
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
    }
  });


  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 3, 5]} intensity={1.8} />
      <group ref={groupRef}>
        <EarthSphere />
        <CatParticles catPoints={catPoints} />
        <EventRings eventPoints={eventPoints} />
      </group>
      <Atmosphere />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enableZoom={true}
        minDistance={1.6}
        maxDistance={4.0}
      />
    </>
  );
}


// ─── Paw Print Placeholder ────────────────────────────────────────────────────
function generatePawPrintPlaceholders(): Array<{ lat: number; lng: number }> {
  return [
    { lat: 40.7, lng: -74.0 }, { lat: 51.5, lng: -0.1 }, { lat: 35.7, lng: 139.7 },
    { lat: 48.9, lng: 2.3 }, { lat: -33.9, lng: 151.2 }, { lat: 19.4, lng: -99.1 },
    { lat: 55.8, lng: 37.6 }, { lat: 28.6, lng: 77.2 },
  ];
}

// ─── Exported Component ───────────────────────────────────────────────────────
export default function GlobeScene(props: GlobeSceneProps) {
  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      role="img"
      aria-label="Interactive 3D globe showing global cat sighting density">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          if (!gl.capabilities.isWebGL2) return;
        }}>
        <GlobeInner {...props} />
      </Canvas>
    </div>
  );
}
