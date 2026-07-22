"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

function Model({ onLoad }: { onLoad?: () => void }) {
  const gltf = useGLTF("/dev2.glb");
  const ref = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  const fitted = useRef(false);
  const baseScale = useRef(1);
  const currentLookAtY = useRef(0.5);
  const basePosition = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!gltf.scene || fitted.current) return;

    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1;
    baseScale.current = scale;

    if (ref.current) {
      ref.current.scale.set(scale, scale, scale);
      ref.current.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );
      // Store the base centered position for later offset
      basePosition.current.copy(ref.current.position);
    }

    // Start zoomed into the face (very close)
    camera.position.set(0, 0.6, 0.8);
    camera.lookAt(0, 0.5, 0);
    camera.updateProjectionMatrix();

    fitted.current = true;
    if (onLoad) onLoad();
  }, [gltf.scene, camera, onLoad]);

  useFrame(() => {
    if (!ref.current || !fitted.current) return;

    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const t = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;

    // ── 3-Stage Animation ──
    // Stage 1: 0–25%   → Face close-up    (camera zooms)
    // Stage 2: 25–45%  → Mid zoom/portrait (camera zooms, rotation completes)
    // Stage 3: 45–100% → Model slides left (camera stays locked, size stays same)
    let targetCamZ: number;
    let targetCamY: number;
    let lookAtY: number;
    let modelOffsetX = 0;
    let modelOffsetY = 0;

    if (t <= 0.15) {
      // Stage 1: Face close-up
      const st = THREE.MathUtils.smoothstep(t, 0, 0.15);
      targetCamZ = THREE.MathUtils.lerp(0.6, 1.2, st);
      targetCamY = THREE.MathUtils.lerp(0.5, 0.5, st);
      lookAtY = THREE.MathUtils.lerp(0.5, 0.4, st);
    } else if (t <= 0.25) {
      // Stage 2: Mid zoom / portrait
      const st = THREE.MathUtils.smoothstep(t, 0.15, 0.25);
      targetCamZ = THREE.MathUtils.lerp(1.2, 2.8, st);
      targetCamY = THREE.MathUtils.lerp(0.5, 0.2, st);
      lookAtY = THREE.MathUtils.lerp(0.4, 0.1, st);
    } else {
      // Stage 3: Slide model to the left side, keeping camera distance locked
      const st = THREE.MathUtils.smoothstep(t, 0.25, 0.5);
      targetCamZ = 2.8;  // same size as end of rotation
      targetCamY = 0.2;  // locked
      lookAtY = 0.1;     // locked
      modelOffsetX = THREE.MathUtils.lerp(0, -1.2, st);  // slide left
      modelOffsetY = THREE.MathUtils.lerp(0, 0.2, st);   // slightly up
    }

    // Smooth camera position (no X movement — model moves instead)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.06);

    // Smooth lookAt transition
    currentLookAtY.current = THREE.MathUtils.lerp(currentLookAtY.current, lookAtY, 0.06);
    camera.lookAt(0, currentLookAtY.current, 0);

    // Smoothly move the model group position (for stage 4 slide)
    const targetPosX = basePosition.current.x + modelOffsetX;
    const targetPosY = basePosition.current.y + modelOffsetY;
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetPosX, 0.06);
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetPosY, 0.06);

    // Rotation: turns 90 degrees to face right (towards text) by t=0.25, then stops
    const rotationT = THREE.MathUtils.smoothstep(t, 0.05, 0.25);
    const targetRotY = rotationT * (Math.PI / 2);
    ref.current.rotation.y = THREE.MathUtils.lerp(
      ref.current.rotation.y,
      targetRotY,
      0.06
    );
  });

  return (
    <group ref={ref}>
      <primitive object={gltf.scene} />
    </group>
  );
}

export default function ModelViewer({ onLoad }: { onLoad?: () => void }) {
  return (
    <div className="model-container">
      <Canvas
        camera={{
          position: [0, 0.6, 0.8],
          fov: 50,
          near: 0.01,
          far: 50,
        }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0} />
        <directionalLight position={[5, 8, 5]} intensity={0} />
        <directionalLight position={[-3, -3, -5]} intensity={0} />
        <pointLight position={[0, 3, 2]} intensity={-8} color="#ffffff" />
        <ambientLight intensity={1.5} />
        <directionalLight position={[0, 5, 5]} intensity={2.5} />
        <directionalLight position={[0, -5, -5]} intensity={1.0} />
        <Suspense fallback={null}>
          <Model onLoad={onLoad} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/dev2.glb");
