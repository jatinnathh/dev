"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

function Model() {
  const gltf = useGLTF("/dev.glb");
  const ref = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  const fitted = useRef(false);
  const baseScale = useRef(1);

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
    }

    // Start zoomed into the face
    camera.position.set(0, 0.3, 1.8);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    fitted.current = true;
  }, [gltf.scene, camera]);

  useFrame(() => {
    if (!ref.current || !fitted.current) return;

    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const t = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;

    // Camera zoom out: z goes from 1.8 (face close-up) to 6 (full view)
    const targetZ = 1.8 + t * 4.5;
    const targetY = 0.3 * (1 - t); // settle from above-center to center
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.06);
    camera.lookAt(0, 0, 0);

    // Rotate model: full 360° + subtle continuous spin
    const targetRotY = t * Math.PI * 2;
    ref.current.rotation.y = THREE.MathUtils.lerp(
      ref.current.rotation.y,
      targetRotY,
      0.06
    );
    ref.current.rotation.y += 0.0008; // subtle auto-spin
  });

  return (
    <group ref={ref}>
      <primitive object={gltf.scene} />
    </group>
  );
}

export default function ModelViewer() {
  return (
    <div className="model-container">
      <Canvas
        camera={{
          position: [0, 0.3, 1.8],
          fov: 50,
          near: 0.001,
          far: 10000,
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[5, 8, 5]} intensity={2} />
        <directionalLight position={[-3, -3, -5]} intensity={0.4} />
        <pointLight position={[0, 3, 2]} intensity={1} color="#ffffff" />
        <Environment preset="studio" />
        <Suspense fallback={null}>
          <Model />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/dev.glb");
