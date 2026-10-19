"use client";
/* eslint-disable react-hooks/immutability -- the particle pool is mutated every frame by design */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { toolIcons } from "./toolIcons";

/** Written by the character every frame: where the laptop screen is, and how hard to pour. */
export const fountain = {
  origin: new THREE.Vector3(),
  /** steady stream, 0..1 (he's typing) */
  rate: 0,
  /** one-off burst size, consumed on the next frame */
  burst: 0,
  /** sideways bias so the stream stays on his side of the screen (scene units / s) */
  lean: 0,
};

const MAX = 140;
const LIFE = 3.1;
const GRAVITY = 3.9;
const SIZE = 0.12;
const FLOW = 15; // tiles a second at full pour
const DRAG = 0.35; // a little air resistance: soft, floaty arcs
const STEP = 1 / 120; // fixed physics step, so motion is identical at any frame rate

type Icon = { path: string; hex: string };
const GLYPHS = ["</>", "{ }", "☕"]; // a few fun extras between the logos

/** a glossy rounded tile per tool: brand-coloured logo on a light card (or white on a dark brand) */
function tileTexture(icon: Icon | null, glyph?: string) {
  const S = 128, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d")!;
  const hex = icon ? `#${icon.hex}` : "#22d3ee";
  const lum = icon ? (() => { const n = parseInt(icon.hex, 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; })() : 1;
  const darkBrand = lum < 0.22;
  // card
  g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 10; g.shadowOffsetY = 4;
  g.beginPath(); g.roundRect(10, 8, S - 20, S - 20, 26);
  const card = g.createLinearGradient(0, 8, 0, S - 12);
  if (darkBrand) { card.addColorStop(0, "#2a3446"); card.addColorStop(1, "#111827"); } else { card.addColorStop(0, "#ffffff"); card.addColorStop(1, "#dfe7f2"); }
  g.fillStyle = card; g.fill(); g.shadowColor = "transparent";
  // gloss
  g.save(); g.beginPath(); g.roundRect(10, 8, S - 20, S - 20, 26); g.clip();
  const gloss = g.createLinearGradient(0, 8, 0, 60); gloss.addColorStop(0, "rgba(255,255,255,0.55)"); gloss.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gloss; g.fillRect(10, 8, S - 20, 52); g.restore();
  g.strokeStyle = darkBrand ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.08)"; g.lineWidth = 2;
  g.beginPath(); g.roundRect(10, 8, S - 20, S - 20, 26); g.stroke();
  // logo (simple-icons paths are on a 24 x 24 grid)
  if (icon) {
    g.save(); g.translate(S / 2 - 30, S / 2 - 32); g.scale(60 / 24, 60 / 24);
    g.fillStyle = darkBrand ? "#ffffff" : hex; g.fill(new Path2D(icon.path)); g.restore();
  } else if (glyph) {
    g.fillStyle = "#0b1220"; g.font = "700 46px ui-monospace, Menlo, Consolas, monospace"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(glyph, S / 2, S / 2 - 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

type P = { alive: boolean; age: number; pos: THREE.Vector3; vel: THREE.Vector3; spin: number; rot: number; landed: number; size: number; tex: number };

/**
 * Developer tools pouring out of the laptop like a fountain: a steady column that opens out all around him, tumbles
 * lazily, lands with a soft bounce and fades. Pooled sprites, fixed-step physics, no allocation per frame.
 */
export default function ToolFountain() {
  const textures = useMemo(() => {
    const list = toolIcons.map((i) => tileTexture(i));
    return [...list, ...GLYPHS.map((gl) => tileTexture(null, gl))];
  }, []);
  const group = useRef<THREE.Group>(null);
  const sprites = useMemo(() => Array.from({ length: MAX }, () => {
    const m = new THREE.SpriteMaterial({ map: textures[0], transparent: true, toneMapped: false, depthWrite: false });
    const s = new THREE.Sprite(m); s.visible = false; return s;
  }), [textures]);
  const parts = useMemo<P[]>(() => Array.from({ length: MAX }, () => ({
    alive: false, age: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: 0, rot: 0, landed: -1, size: SIZE, tex: 0,
  })), []);
  const acc = useRef(0);
  const next = useRef(0);
  const count = useRef(0);
  const ring = useRef(0);
  const flow = useRef(0); // eased pour rate
  const surge = useRef(0); // short boost when the lid opens
  const physics = useRef(0); // leftover time for the fixed-step integrator

  /** integrate one particle by dt (fixed small steps keep the arcs smooth) */
  const step = (p: P, dt: number) => {
    p.age += dt;
    p.vel.y -= GRAVITY * dt;
    p.vel.multiplyScalar(1 - DRAG * dt);
    p.pos.addScaledVector(p.vel, dt);
    p.spin *= 1 - 0.4 * dt;
    p.rot += p.spin * dt;
    // land softly: one small bounce, then it slides to a stop and fades
    if (p.pos.y < p.size * 0.5 && p.vel.y < 0) {
      p.pos.y = p.size * 0.5;
      if (p.landed < 0) { p.landed = p.age; p.vel.y *= -0.3; p.vel.x *= 0.55; p.vel.z *= 0.55; p.spin *= 0.4; }
      else { p.vel.y = 0; p.vel.x *= 1 - 6 * dt; p.vel.z *= 1 - 6 * dt; }
    }
  };

  /** start a tile; `lead` = how long ago (within this frame) it was due, so the stream stays evenly spaced */
  const spawn = (lead: number) => {
    let i = -1;
    for (let k = 0; k < MAX; k++) { const j = (ring.current + k) % MAX; if (!parts[j].alive) { i = j; break; } }
    if (i < 0) return;
    ring.current = (i + 1) % MAX;
    const p = parts[i];
    p.alive = true; p.age = 0; p.landed = -1;
    // a fountain: a column straight up out of the laptop that opens out in every direction (golden-angle spread, so
    // consecutive tiles never bunch) and lands in a ring around him. Tiles heading for the text column are held back.
    p.pos.copy(fountain.origin).add(new THREE.Vector3((Math.random() - 0.5) * 0.06, 0, 0.14)); // in front of his face
    const az = (count.current++ * 2.39996) % (Math.PI * 2);
    const out = 0.5 + Math.random() * 0.45;
    let vx = Math.cos(az) * out;
    const vz = Math.sin(az) * out * 0.8 + 0.32;
    if (vx * fountain.lean < 0) vx *= 0.3; // lean points away from the text
    p.vel.set(vx, 2.15 + Math.random() * 0.35, vz);
    p.spin = (Math.random() - 0.5) * 2.2; p.rot = (Math.random() - 0.5) * 0.4;
    p.size = SIZE * (0.85 + Math.random() * 0.3);
    p.tex = next.current++ % textures.length;
    const m = sprites[i].material; m.map = textures[p.tex]; m.needsUpdate = true;
    for (let t = lead; t > 1e-6; t -= STEP) step(p, Math.min(STEP, t));
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    // the pour eases in and out; opening the lid adds a short surge to the same stream (no clumpy bursts)
    if (fountain.burst > 0) { surge.current = 1; fountain.burst = 0; }
    surge.current = Math.max(0, surge.current - dt / 0.9);
    flow.current += (fountain.rate - flow.current) * (1 - Math.exp(-4 * dt));
    const rate = FLOW * (flow.current + 1.4 * surge.current * surge.current);
    // spawn at the exact moment each tile is due within this frame
    acc.current += rate * dt;
    while (acc.current >= 1) { acc.current -= 1; spawn(rate > 0 ? acc.current / rate : 0); }

    physics.current += dt;
    let steps = 0;
    while (physics.current >= STEP && steps < 12) { physics.current -= STEP; steps++; }

    for (let i = 0; i < MAX; i++) {
      const p = parts[i], sp = sprites[i];
      if (!p.alive) { sp.visible = false; continue; }
      for (let k = 0; k < steps; k++) step(p, STEP);
      const sinceLand = p.landed < 0 ? -1 : p.age - p.landed;
      if (p.age >= LIFE || sinceLand > 0.75) { p.alive = false; sp.visible = false; continue; }
      // smooth in, soft squash on landing, then shrink + fade
      const grow = smooth01(p.age / 0.5); // tiny as they pass his face, full size as the fountain opens out
      const squash = sinceLand >= 0 ? 1 + 0.12 * Math.exp(-sinceLand * 10) * Math.cos(sinceLand * 18) : 1;
      const fade = sinceLand >= 0 ? 1 - smooth01((sinceLand - 0.3) / 0.45) : 1 - smooth01((p.age - (LIFE - 0.4)) / 0.4);
      const k = p.size * grow * (0.6 + 0.4 * fade);
      sp.visible = true;
      sp.position.copy(p.pos);
      sp.scale.set(k * squash, k / squash, 1);
      sp.material.rotation = p.rot;
      sp.material.opacity = fade;
    }
  });

  return (
    <group ref={group}>
      {sprites.map((s, i) => <primitive key={i} object={s} />)}
    </group>
  );
}

function smooth01(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
