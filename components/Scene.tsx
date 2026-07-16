"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { Suspense, useRef, useEffect } from "react";
import * as THREE from "three";

function Model() {
  const { scene } = useGLTF("/dev.glb");
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const fitted = useRef(false);

  useEffect(() => {
    if (!scene || fitted.current) return;

    // Compute bounding box of the loaded model
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    console.log("Model size:", size);
    console.log("Model center:", center);

    // Normalize: scale model to fit within a 2-unit box
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1;

    if (groupRef.current) {
      groupRef.current.scale.set(scale, scale, scale);
      // Recenter after scaling
      groupRef.current.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );
    }

    // Set camera
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    fitted.current = true;
  }, [scene, camera]);

  useFrame(() => {
    if (!groupRef.current || !fitted.current) return;

    const scrollY = window.scrollY;
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    const offset =
      maxScroll > 0 ? Math.min(Math.max(scrollY / maxScroll, 0), 1) : 0;

    // Rotate a full 360° over full scroll
    const targetRotationY = offset * Math.PI * 2;
    // Zoom from 1x to 2x
    const baseScale = groupRef.current.userData.baseScale || 1;
    const targetScale = baseScale * (1 + offset);

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotationY,
      0.08
    );
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

export default function Scene() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        background: "#000",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50, near: 0.001, far: 10000 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 5]} intensity={2} />
        <directionalLight position={[-5, -5, -5]} intensity={0.5} />
        <pointLight position={[0, 5, 0]} intensity={1} />
        <Environment preset="studio" />
        <Suspense fallback={null}>
          <Model />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/dev.glb");
