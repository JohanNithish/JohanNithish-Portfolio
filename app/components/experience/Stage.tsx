"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import { SceneContents } from "./Scene";

type Props = { tracking: boolean; dof: boolean; onReady: () => void; onProgress: (pct: number) => void };

/** The WebGL canvas. Loaded lazily (client only) so the page text renders first. */
export default function Stage({ tracking, dof, onReady, onProgress }: Props) {
  useEffect(() => {
    const m = THREE.DefaultLoadingManager;
    m.onProgress = (_url, loaded, total) => onProgress(total ? (loaded / total) * 100 : 0);
    return () => { m.onProgress = () => {}; };
  }, [onProgress]);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: 30, near: 0.03, far: 40, position: [0, 1.2, 1.8] }}
      gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: process.env.NEXT_PUBLIC_SHOTS === "1" }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.AgXToneMapping;
        gl.toneMappingExposure = 1.1;
        scene.background = new THREE.Color("#05070b");
      }}
    >
      <Suspense fallback={null}>
        <SceneContents tracking={tracking} dof={dof} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
