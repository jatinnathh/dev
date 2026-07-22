"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import { useScroll } from "framer-motion";
import { CollectionItem } from "./CollectionSurfer";

/* ─────────────────────────────────────────────────
   Shared vertex shader
───────────────────────────────────────────────── */
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ─────────────────────────────────────────────────
   Front image: dissolves away with radial ripple +
   Sobel edge glow + fbm sparkle
───────────────────────────────────────────────── */
const frontFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uDissolve;
  uniform vec2 uCenter;
  uniform float uTime;
  uniform float uGrayscale;
  uniform float uEdgeIntensity;
  uniform float uEdgeBrightness;
  varying vec2 vUv;

  mat3 sobelX = mat3(
    -1.0, 0.0, 1.0,
    -2.0, 0.0, 2.0,
    -1.0, 0.0, 1.0
  );
  mat3 sobelY = mat3(
    -1.0, -2.0, -1.0,
     0.0,  0.0,  0.0,
     1.0,  2.0,  1.0
  );

  float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }

  float sobel(sampler2D tex, vec2 uv, vec2 texelSize) {
    float gx = 0.0;
    float gy = 0.0;
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * texelSize;
        float lum = getLuminance(texture2D(tex, uv + offset).rgb);
        gx += lum * sobelX[i + 1][j + 1];
        gy += lum * sobelY[i + 1][j + 1];
      }
    }
    return sqrt(gx * gx + gy * gy);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
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

    vec4 texColor = texture2D(uTexture, uv);
    float gray = getLuminance(texColor.rgb);
    texColor.rgb = mix(texColor.rgb, vec3(gray), uGrayscale);

    vec2 centeredUv = vUv - uCenter;
    float aspect = uResolution.x / uResolution.y;
    centeredUv.x *= aspect;
    float dist = length(centeredUv);
    float angle = atan(centeredUv.y, centeredUv.x);

    float noiseScale = 6.0;
    vec2 pixelatedUv = floor(vUv * uResolution / noiseScale) * noiseScale / uResolution;
    float blockNoise = fbm(pixelatedUv * 100.0) * 0.15;
    float angularNoise = fbm(vec2(angle * 5.0, 0.0)) * 0.15;
    float noisyDist = dist + blockNoise + angularNoise;

    float maxDist = length(vec2(aspect * 0.5, 0.5));
    float normalizedDist = noisyDist / maxDist;
    float dissolveThreshold = uDissolve * 1.5;

    vec2 texelSize = 1.0 / uResolution;
    float edge = sobel(uTexture, uv, texelSize);
    edge = pow(edge, 0.7) * 2.0;
    edge = clamp(edge, 0.0, 1.0);

    float dissolveMask = smoothstep(dissolveThreshold - 0.03, dissolveThreshold, normalizedDist);

    vec3 finalColor = texColor.rgb;
    float edgeGlow = edge * uEdgeIntensity * 2.0 * (1.0 + uGrayscale * 3.0);
    finalColor += vec3(1.0) * edgeGlow * uEdgeBrightness;

    float edgeZoneWidth = 0.15 * (1.0 - uDissolve) + 0.02;
    float edgeZone = smoothstep(dissolveThreshold - edgeZoneWidth, dissolveThreshold - edgeZoneWidth + 0.04, normalizedDist) *
                     smoothstep(dissolveThreshold + 0.02, dissolveThreshold - 0.02, normalizedDist);
    float sparkle = hash(floor(vUv * uResolution / 4.0)) * edgeZone;
    float edgeBrightness = (1.0 - uDissolve) * uEdgeBrightness * (1.0 + uGrayscale * 2.0);
    finalColor += vec3(sparkle * 3.0 * edgeBrightness);

    gl_FragColor = vec4(finalColor, dissolveMask * texColor.a);
  }
`;

/* ─────────────────────────────────────────────────
   Back image: revealed beneath with edge glow
───────────────────────────────────────────────── */
const backFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uDissolve;
  uniform vec2 uCenter;
  uniform float uTime;
  uniform float uBrightness;
  uniform float uEdgeIntensity;
  uniform float uDarkness;
  uniform float uGrayscale;
  varying vec2 vUv;

  mat3 sobelX = mat3(
    -1.0, 0.0, 1.0,
    -2.0, 0.0, 2.0,
    -1.0, 0.0, 1.0
  );
  mat3 sobelY = mat3(
    -1.0, -2.0, -1.0,
     0.0,  0.0,  0.0,
     1.0,  2.0,  1.0
  );

  float getLuminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
  }

  float sobel(sampler2D tex, vec2 uv, vec2 texelSize) {
    float gx = 0.0;
    float gy = 0.0;
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * texelSize;
        float lum = getLuminance(texture2D(tex, uv + offset).rgb);
        gx += lum * sobelX[i + 1][j + 1];
        gy += lum * sobelY[i + 1][j + 1];
      }
    }
    return sqrt(gx * gx + gy * gy);
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

    vec4 texColor = texture2D(uTexture, uv);
    float gray = getLuminance(texColor.rgb);
    texColor.rgb = mix(texColor.rgb, vec3(gray), uGrayscale);

    vec2 texelSize = 1.0 / uResolution;
    float edge = sobel(uTexture, uv, texelSize);
    edge = pow(edge, 0.7) * 2.0;
    edge = clamp(edge, 0.0, 1.0);

    vec3 baseColor = mix(texColor.rgb, vec3(0.0), uDarkness);
    baseColor += vec3(1.0) * edge * uEdgeIntensity * 2.0;

    gl_FragColor = vec4(clamp(baseColor, 0.0, 1.0), texColor.a);
  }
`;

/* ─────────────────────────────────────────────────
   Per-pair scene rendered inside Canvas
───────────────────────────────────────────────── */
interface PairSceneProps {
  frontUrl: string;
  backUrl: string;
  getProgress: () => number;
}

function PairScene({ frontUrl, backUrl, getProgress }: PairSceneProps) {
  const [texFront, texBack] = useTexture([frontUrl, backUrl]);
  const frontMatRef = useRef<THREE.ShaderMaterial>(null);
  const backMatRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  const uniformsFront = useMemo(() => ({
    uTexture: { value: texFront },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uImageResolution: { value: new THREE.Vector2((texFront.image as HTMLImageElement)?.naturalWidth ?? 1024, (texFront.image as HTMLImageElement)?.naturalHeight ?? 1024) },
    uDissolve: { value: 0.0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0.0 },
    uGrayscale: { value: 0.0 },
    uEdgeIntensity: { value: 0.0 },
    uEdgeBrightness: { value: 1.0 },
  }), [texFront, size]);

  const uniformsBack = useMemo(() => ({
    uTexture: { value: texBack },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uImageResolution: { value: new THREE.Vector2((texBack.image as HTMLImageElement)?.naturalWidth ?? 1024, (texBack.image as HTMLImageElement)?.naturalHeight ?? 1024) },
    uDissolve: { value: 0.0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uTime: { value: 0.0 },
    uBrightness: { value: 0.0 },
    uEdgeIntensity: { value: 0.6 },
    uDarkness: { value: 1.0 },
    uGrayscale: { value: 1.0 },
  }), [texBack, size]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const p = getProgress();

    if (frontMatRef.current) {
      frontMatRef.current.uniforms.uTime.value = t;
      frontMatRef.current.uniforms.uResolution.value.set(size.width, size.height);
      frontMatRef.current.uniforms.uDissolve.value = p;
      frontMatRef.current.uniforms.uGrayscale.value = Math.min(1.0, p / 0.4);
      frontMatRef.current.uniforms.uEdgeIntensity.value = p * 0.5;
      frontMatRef.current.uniforms.uEdgeBrightness.value = 1.0 - p;
    }
    if (backMatRef.current) {
      const acc = Math.min(1.0, p * 1.1);
      backMatRef.current.uniforms.uTime.value = t;
      backMatRef.current.uniforms.uResolution.value.set(size.width, size.height);
      backMatRef.current.uniforms.uEdgeIntensity.value = 0.6 * (1.0 - acc);
      backMatRef.current.uniforms.uDarkness.value = 1.0 - acc;
      backMatRef.current.uniforms.uGrayscale.value = 1.0 - acc;
    }
  });

  return (
    <>
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial ref={backMatRef} vertexShader={vertexShader} fragmentShader={backFragmentShader} uniforms={uniformsBack} transparent />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial ref={frontMatRef} vertexShader={vertexShader} fragmentShader={frontFragmentShader} uniforms={uniformsFront} transparent />
      </mesh>
    </>
  );
}

/* ─────────────────────────────────────────────────
   Master scene — manages index + progress routing
───────────────────────────────────────────────── */
interface MasterSceneProps {
  items: CollectionItem[];
  scrollYProgress: any;
  onIndexChange: (i: number) => void;
}

function MasterScene({ items, scrollYProgress, onIndexChange }: MasterSceneProps) {
  const lastTextIdx = useRef(0);
  const lastSceneIdx = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const numTransitions = items.length - 1;

  useFrame(() => {
    const g = Math.max(0, Math.min(1, scrollYProgress.get()));
    
    const sceneIdx = Math.min(Math.floor(g * numTransitions), numTransitions - 1);
    if (sceneIdx !== lastSceneIdx.current) {
      lastSceneIdx.current = sceneIdx;
      setActiveIdx(sceneIdx);
    }

    const textIdx = Math.min(Math.round(g * numTransitions), items.length - 1);
    if (textIdx !== lastTextIdx.current) {
      lastTextIdx.current = textIdx;
      onIndexChange(textIdx);
    }
  });

  const makeProgress = (idx: number) => () => {
    const g = Math.max(0, Math.min(1, scrollYProgress.get()));
    return Math.max(0, Math.min(1, g * numTransitions - idx));
  };

  return (
    <>
      {activeIdx < items.length - 1 && (
        <React.Suspense fallback={null}>
          <PairScene
            key={activeIdx}
            frontUrl={items[activeIdx].image}
            backUrl={items[activeIdx + 1].image}
            getProgress={makeProgress(activeIdx)}
          />
        </React.Suspense>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────
   Tech pill colour palettes
───────────────────────────────────────────────── */
const TECH_BG    = ["rgba(168,85,247,0.18)","rgba(59,130,246,0.18)","rgba(16,185,129,0.18)","rgba(245,158,11,0.18)","rgba(239,68,68,0.18)","rgba(236,72,153,0.18)","rgba(6,182,212,0.18)","rgba(139,92,246,0.18)"];
const TECH_TEXT  = ["#c084fc","#60a5fa","#34d399","#fbbf24","#f87171","#f472b6","#22d3ee","#a78bfa"];
const TECH_BORDER= ["rgba(168,85,247,0.4)","rgba(59,130,246,0.4)","rgba(16,185,129,0.4)","rgba(245,158,11,0.4)","rgba(239,68,68,0.4)","rgba(236,72,153,0.4)","rgba(6,182,212,0.4)","rgba(139,92,246,0.4)"];

/* ─────────────────────────────────────────────────
   Public component
───────────────────────────────────────────────── */
export interface ScrollDissolveRevealProps {
  items: CollectionItem[];
  className?: string;
  containerClassName?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}

export function ScrollDissolveReveal({ items, className, containerClassName, scrollContainerRef }: ScrollDissolveRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
    ...(scrollContainerRef && { container: scrollContainerRef }),
  });

  const currentItem = items[currentIndex] ?? items[0];

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      style={{ height: `${items.length * 80}vh`, position: "relative", width: "100%" }}
    >
      {/* ── Sticky viewer ── */}
      <div
        className={className}
        style={{ position: "sticky", top: "10vh", height: "80vh", width: "100%" }}
      >
        {/* Top gradient + title */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          padding: "2rem 2.5rem 3rem",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, transparent 100%)",
          zIndex: 10, pointerEvents: "none",
        }}>
          <p style={{
            fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem",
            fontFamily: "var(--font-geist-mono, monospace)",
          }}>
            Project {currentIndex + 1} / {items.length}
          </p>
          <h2 style={{
            fontSize: "clamp(1.25rem, 2.5vw, 1.875rem)", fontWeight: 700,
            letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.2, margin: 0,
          }}>
            {currentItem.title}
          </h2>
        </div>

        {/* Canvas */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden" }}>
          <Canvas>
            <OrthographicCamera makeDefault manual left={-1} right={1} top={1} bottom={-1} near={0.1} far={10} position={[0, 0, 1]} />
            <MasterScene items={items} scrollYProgress={scrollYProgress} onIndexChange={setCurrentIndex} />
          </Canvas>
        </div>

        {/* Bottom gradient + description + pills */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "4rem 2.5rem 2rem",
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)",
          zIndex: 10,
        }}>
          {currentItem.description && (
            <p style={{
              fontSize: "clamp(0.75rem, 1.2vw, 0.875rem)",
              color: "rgba(255,255,255,0.62)", lineHeight: 1.7,
              marginBottom: "1rem", maxWidth: "540px",
            }}>
              {currentItem.description}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {currentItem.tech?.map((t, i) => (
              <span key={`${currentIndex}-${t}-${i}`} style={{
                display: "inline-flex", alignItems: "center",
                padding: "5px 14px", borderRadius: "999px",
                fontSize: "12px", fontFamily: "monospace", fontWeight: 500,
                letterSpacing: "0.02em",
                color: TECH_TEXT[i % TECH_TEXT.length],
                background: TECH_BG[i % TECH_BG.length],
                border: `1px solid ${TECH_BORDER[i % TECH_BORDER.length]}`,
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
