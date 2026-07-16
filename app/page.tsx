"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

function DevModel() {
  const gltf = useGLTF("/dev.glb");
  const ref = useRef<THREE.Group>(null!);

  // Normalize on first render
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const normalizeScale = maxDim > 0 ? 2 / maxDim : 1;

  useFrame(() => {
    if (!ref.current) return;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const t = maxScroll > 0 ? scrollY / maxScroll : 0;

    ref.current.rotation.y += 0.003;
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, ref.current.rotation.y + t * 0.05, 0.1);
    
    const s = normalizeScale * (1 + t * 0.8);
    ref.current.scale.set(s, s, s);
  });

  return (
    <group
      ref={ref}
      position={[-center.x * normalizeScale, -center.y * normalizeScale, -center.z * normalizeScale]}
      scale={[normalizeScale, normalizeScale, normalizeScale]}
    >
      <primitive object={gltf.scene} />
    </group>
  );
}

export default function Home() {
  return (
    <div style={{ width: "100vw", height: "300vh", background: "#000", margin: 0, padding: 0 }}>
      <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 50, near: 0.001, far: 10000 }}>
          <color attach="background" args={["#0a0a0a"]} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[5, 10, 5]} intensity={2} />
          <pointLight position={[-5, -5, 5]} intensity={1} />
          <Environment preset="studio" />
          <Suspense fallback={null}>
            <DevModel />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

useGLTF.preload("/dev.glb");
