"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { useScroll } from "framer-motion";
import { CollectionItem } from "./CollectionSurfer";

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const transitionVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;


const transitionFragmentShader = `
  uniform sampler2D uTexture1;
  uniform sampler2D uTexture2;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uDissolve;
  uniform float uTime;
  
  varying vec2 vUv;
  
  float random (in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }
  
  float getNoise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  void main() {
    vec2 ratio = vec2(
      min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
      min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
    );
    vec2 uv = vec2(
      vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
    
    vec4 c1 = texture2D(uTexture1, uv);
    vec4 c2 = texture2D(uTexture2, uv);
    
    // Generate noise for transition
    float noise = getNoise(uv * 8.0 + uTime * 0.15);
    
    // Calculate transition mask
    float threshold = uDissolve * 1.2 - 0.1; 
    float mask = smoothstep(threshold - 0.1, threshold + 0.1, noise);
    
    vec4 baseColor = mix(c2, c1, mask);
    
    // Edge glow effect for the noisy dissolve border
    float edge = smoothstep(threshold - 0.05, threshold + 0.05, noise) - smoothstep(threshold - 0.1, threshold + 0.1, noise);
    vec3 edgeColor = vec3(0.66, 0.33, 0.97); // Purple glow
    
    // Apply glow only where there is text content
    float combinedAlpha = max(c1.a, c2.a);
    baseColor.rgb += edge * edgeColor * combinedAlpha * 2.5;
    
    gl_FragColor = baseColor;
  }
`;

const createTextTexture = (item: any) => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  
  // Background - transparent for cool overlay effect
  ctx.clearRect(0, 0, 1024, 1024);
  
  // Text styling
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 70px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  
  const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
  };

  let y = wrapText(item.title, 512, 250, 900, 85);
  
  ctx.font = "35px 'Inter', sans-serif";
  ctx.fillStyle = "#cccccc";
  y += 60;
  if (item.description) {
      y = wrapText(item.description, 512, y, 900, 50);
  }

  if (item.tech && item.tech.length > 0) {
      ctx.font = "30px monospace";
      ctx.fillStyle = "#a855f7"; // purple to match the creepy button
      y += 60;
      wrapText(item.tech.join(" • "), 512, y, 900, 45);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

interface SceneProps {
  items: any[];
  scrollYProgress: any;
}

const Scene = ({ items, scrollYProgress }: SceneProps) => {
  const textures = useMemo(() => items.map(createTextTexture), [items]);

  useEffect(() => {
    return () => {
      textures.forEach(t => t?.dispose());
    };
  }, [textures]);

  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  const uniforms = useMemo(() => {
    if (!textures[0]) return null;
    return {
      uTexture1: { value: textures[0] },
      uTexture2: { value: textures[1] },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uImageResolution: {
        value: new THREE.Vector2(1024, 1024),
      },
      uDissolve: { value: 0.0 },
      uTime: { value: 0.0 },
    };
  }, [textures, size]);

  useFrame((state) => {
    const timeInSeconds = state.clock.getElapsedTime();
    let globalProgress = scrollYProgress.get();
    
    // Clamp to [0,1]
    globalProgress = Math.max(0, Math.min(1, globalProgress));

    const numTransitions = items.length - 1;
    const scaledProgress = globalProgress * numTransitions;
    const currentIndex = Math.min(Math.floor(scaledProgress), numTransitions - 1);
    const localProgress = scaledProgress - currentIndex;

    if (materialRef.current && textures[currentIndex] && textures[currentIndex + 1]) {
      materialRef.current.uniforms.uTexture1.value = textures[currentIndex];
      materialRef.current.uniforms.uTexture2.value = textures[currentIndex + 1];
      materialRef.current.uniforms.uTime.value = timeInSeconds;
      materialRef.current.uniforms.uResolution.value.set(size.width, size.height);
      materialRef.current.uniforms.uDissolve.value = localProgress;
    }
  });

  if (!uniforms) return null;

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={transitionVertexShader}
        fragmentShader={transitionFragmentShader}
        uniforms={uniforms}
        transparent={true}
      />
    </mesh>
  );
};

export interface ScrollDissolveRevealProps {
  items: CollectionItem[];
  className?: string;
  containerClassName?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export function ScrollDissolveReveal({
  items,
  className,
  containerClassName,
  scrollContainerRef,
}: ScrollDissolveRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
    ...(scrollContainerRef && { container: scrollContainerRef })
  });

  return (
    <div
      ref={containerRef}
      className={containerClassName || "relative w-full"}
      style={{ height: `${items.length * 80}vh` }}
    >
      <div className={className || "sticky top-[10vh] h-[80vh] w-full"}>
        <Canvas>
          <OrthographicCamera
            makeDefault
            manual
            left={-1}
            right={1}
            top={1}
            bottom={-1}
            near={0.1}
            far={10}
            position={[0, 0, 1]}
          />
          <React.Suspense fallback={null}>
            <Scene
              items={items}
              scrollYProgress={scrollYProgress}
            />
          </React.Suspense>
        </Canvas>
      </div>
    </div>
  );
}
