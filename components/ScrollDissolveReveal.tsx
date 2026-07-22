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
  
  #define NUM_OCTAVES 5
  float fbm(vec2 x) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100);
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
      for (int i = 0; i < NUM_OCTAVES; ++i) {
          v += a * getNoise(x);
          x = rot * x * 2.0 + shift;
          a *= 0.5;
      }
      return v;
  }
  
  // Luminance helper
  float getLuminance(vec3 c) {
      return dot(c, vec3(0.299, 0.587, 0.114));
  }
  
  // Sobel edge detection on a texture
  float sobelEdge(sampler2D tex, vec2 uv, vec2 texelSize) {
      float tl = getLuminance(texture2D(tex, uv + vec2(-texelSize.x, texelSize.y)).rgb);
      float t  = getLuminance(texture2D(tex, uv + vec2(0.0, texelSize.y)).rgb);
      float tr = getLuminance(texture2D(tex, uv + vec2(texelSize.x, texelSize.y)).rgb);
      float l  = getLuminance(texture2D(tex, uv + vec2(-texelSize.x, 0.0)).rgb);
      float r  = getLuminance(texture2D(tex, uv + vec2(texelSize.x, 0.0)).rgb);
      float bl = getLuminance(texture2D(tex, uv + vec2(-texelSize.x, -texelSize.y)).rgb);
      float b  = getLuminance(texture2D(tex, uv + vec2(0.0, -texelSize.y)).rgb);
      float br = getLuminance(texture2D(tex, uv + vec2(texelSize.x, -texelSize.y)).rgb);
      
      float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
      float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
      
      return sqrt(gx*gx + gy*gy);
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
    
    // Radial distance from center (0 at center, ~0.7 at corners)
    vec2 center = vec2(0.5, 0.5);
    float dist = length(vUv - center) * 1.414; // normalize so corners ≈ 1
    
    // Mix radial gradient with noise for organic feel
    float noise = fbm(uv * 8.0 + uTime * 0.08);
    float maskVal = dist * 0.55 + noise * 0.45;
    
    // Threshold sweeps from center outward
    float threshold = uDissolve * 1.5 - 0.25;
    
    float mask = smoothstep(threshold - 0.12, threshold + 0.12, maskVal);
    
    // --- Edge detection sketch effect in transition zone ---
    vec2 texelSize = vec2(1.0 / uImageResolution.x, 1.0 / uImageResolution.y) * 2.0;
    
    // How deep into the transition zone are we? (0 = fully image1, 1 = fully image2)
    float transitionZone = smoothstep(threshold - 0.3, threshold, maskVal) 
                         - smoothstep(threshold, threshold + 0.3, maskVal);
    
    // Sobel edges from both textures
    float edge1 = sobelEdge(uTexture1, uv, texelSize);
    float edge2 = sobelEdge(uTexture2, uv, texelSize);
    float edges = max(edge1, edge2);
    
    // Sketch version: dark bg + white edges
    vec3 sketchColor = vec3(edges * 2.5);
    
    // Blend: full image → sketch → next image
    vec4 baseColor = mix(c2, c1, mask);
    baseColor.rgb = mix(baseColor.rgb, sketchColor, transitionZone * 0.7);
    
    // --- Blocky sparkle particles ---
    // Pixelate UV for blocky look
    float blockSize = 80.0;
    vec2 blockUv = floor(vUv * blockSize) / blockSize;
    float sparkleNoise = random(blockUv + floor(uTime * 3.0) * 0.1);
    
    // Only show sparkles in the transition edge zone
    float sparkleZone = smoothstep(threshold - 0.15, threshold, maskVal) 
                      - smoothstep(threshold, threshold + 0.15, maskVal);
    
    float sparkle = step(0.85, sparkleNoise) * sparkleZone;
    
    // White sparkle blocks
    baseColor.rgb += sparkle * vec3(1.0, 1.0, 1.0) * 1.5;
    baseColor.a = max(baseColor.a, sparkle + transitionZone * 0.3);
    
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

  let y = wrapText(item.title, 512, 300, 900, 85);
  
  ctx.font = "35px 'Inter', sans-serif";
  ctx.fillStyle = "#cccccc";
  y += 60;
  if (item.description) {
      y = wrapText(item.description, 512, y, 900, 50);
  }

  // Tech is now rendered as DOM pills, not on canvas

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

interface SceneProps {
  items: any[];
  scrollYProgress: any;
  onIndexChange?: (index: number) => void;
}

const Scene = ({ items, scrollYProgress, onIndexChange }: SceneProps) => {
  const textures = useMemo(() => items.map(createTextTexture), [items]);

  useEffect(() => {
    return () => {
      textures.forEach(t => t?.dispose());
    };
  }, [textures]);

  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();
  const lastIndex = useRef(0);

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

    // Notify parent of index change
    if (currentIndex !== lastIndex.current) {
      lastIndex.current = currentIndex;
      onIndexChange?.(currentIndex);
    }

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

const TECH_COLORS = [
  "rgba(168, 85, 247, 0.25)",  // purple
  "rgba(59, 130, 246, 0.25)",  // blue
  "rgba(16, 185, 129, 0.25)",  // emerald
  "rgba(245, 158, 11, 0.25)",  // amber
  "rgba(239, 68, 68, 0.25)",   // red
  "rgba(236, 72, 153, 0.25)",  // pink
  "rgba(6, 182, 212, 0.25)",   // cyan
  "rgba(139, 92, 246, 0.25)",  // violet
  "rgba(249, 115, 22, 0.25)",  // orange
  "rgba(20, 184, 166, 0.25)",  // teal
];

const TECH_TEXT_COLORS = [
  "#c084fc", // purple
  "#60a5fa", // blue
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f87171", // red
  "#f472b6", // pink
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#fb923c", // orange
  "#2dd4bf", // teal
];

const TECH_BORDER_COLORS = [
  "rgba(168, 85, 247, 0.4)",
  "rgba(59, 130, 246, 0.4)",
  "rgba(16, 185, 129, 0.4)",
  "rgba(245, 158, 11, 0.4)",
  "rgba(239, 68, 68, 0.4)",
  "rgba(236, 72, 153, 0.4)",
  "rgba(6, 182, 212, 0.4)",
  "rgba(139, 92, 246, 0.4)",
  "rgba(249, 115, 22, 0.4)",
  "rgba(20, 184, 166, 0.4)",
];

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
    ...(scrollContainerRef && { container: scrollContainerRef })
  });

  const currentItem = items[currentIndex] || items[0];

  return (
    <div
      ref={containerRef}
      className={containerClassName || "relative w-full"}
      style={{ height: `${items.length * 80}vh` }}
    >
      {/* Liquid Glass Card */}
      <div
        className={className || "sticky top-[10vh] h-[80vh] w-full"}
        style={{
          position: "sticky",
          top: "10vh",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: "24px",
            overflow: "hidden",
            background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: `
              0 8px 32px rgba(0,0,0,0.4),
              inset 0 1px 0 rgba(255,255,255,0.1),
              inset 0 -1px 0 rgba(255,255,255,0.05),
              0 0 80px rgba(168, 85, 247, 0.06)
            `,
          }}
        >
          {/* Glass highlight */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
              zIndex: 2,
            }}
          />

          {/* Canvas for dissolve */}
          <div style={{ position: "absolute", inset: 0, borderRadius: "24px", overflow: "hidden" }}>
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
                  onIndexChange={setCurrentIndex}
                />
              </React.Suspense>
            </Canvas>
          </div>

          {/* DOM Tech Pills Overlay */}
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              left: "24px",
              right: "24px",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            {currentItem?.tech?.map((t, i) => (
              <span
                key={`${currentIndex}-${t}-${i}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "6px 16px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  color: TECH_TEXT_COLORS[i % TECH_TEXT_COLORS.length],
                  background: TECH_COLORS[i % TECH_COLORS.length],
                  border: `1px solid ${TECH_BORDER_COLORS[i % TECH_BORDER_COLORS.length]}`,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  transition: "all 0.3s ease",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

