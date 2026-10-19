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

const MAX = 48;
const LIFE = 2.9;
const GRAVITY = 4.2;
const SIZE = 0.13;

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

type P = { alive: boolean; age: number; pos: THREE.Vector3; vel: THREE.Vector3; spin: number; rot: number; bounced: boolean; size: number; tex: number };

/**
 * Developer tools pouring out of the laptop like a fountain: they arc up, tumble, bounce once on the floor with a
 * squash and pop away. Pooled sprites, no allocation per frame.
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
    alive: false, age: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: 0, rot: 0, bounced: false, size: SIZE, tex: 0,
  })), []);
  const acc = useRef(0);
  const next = useRef(0);

  const spawn = (strength = 1) => {
    const i = parts.findIndex((p) => !p.alive);
    if (i < 0) return;
    const p = parts[i];
    p.alive = true; p.age = 0; p.bounced = false;
    // launch from the side of the lid that faces away from the text, a little toward us, so tiles clear his face
    p.pos.copy(fountain.origin).add(new THREE.Vector3(Math.sign(fountain.lean) * (0.2 + Math.random() * 0.08), -0.08, 0.16 + Math.random() * 0.08));
    const up = (1.75 + Math.random() * 0.6) * strength;
    // sprays out sideways (fountain.lean says which way is away from the text), clear of his face
    p.vel.set(fountain.lean * (0.35 + Math.random() * 0.75), up, 0.2 + Math.random() * 0.3);
    p.spin = (Math.random() - 0.5) * 2.6; p.rot = (Math.random() - 0.5) * 0.4; // a lazy tumble
    p.size = SIZE * (0.85 + Math.random() * 0.3);
    p.tex = next.current++ % textures.length;
    const m = sprites[i].material; m.map = textures[p.tex]; m.needsUpdate = true;
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    // pour
    if (fountain.burst > 0) { for (let k = 0; k < fountain.burst; k++) spawn(1.15); fountain.burst = 0; }
    acc.current += fountain.rate * 3.5 * dt; // a steady, unhurried stream while he types
    while (acc.current >= 1) { spawn(); acc.current -= 1; }

    for (let i = 0; i < MAX; i++) {
      const p = parts[i], s = sprites[i];
      if (!p.alive) { s.visible = false; continue; }
      p.age += dt;
      p.vel.y -= GRAVITY * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.rot += p.spin * dt;
      // one bouncy landing on the floor, then it pops
      let squash = 1;
      if (p.pos.y < p.size * 0.5 && p.vel.y < 0) {
        if (!p.bounced) { p.bounced = true; p.pos.y = p.size * 0.5; p.vel.y *= -0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; p.spin *= -0.5; p.age = Math.max(p.age, LIFE - 0.55); }
        else p.age = LIFE;
      }
      if (p.bounced) squash = 1 + 0.14 * Math.exp(-(p.age - (LIFE - 0.55)) * 9);
      if (p.age >= LIFE) { p.alive = false; s.visible = false; continue; }
      // pop in, pop out
      const t = p.age / LIFE;
      const grow = Math.min(1, p.age / 0.18), out = t > 0.86 ? Math.max(0, 1 - (t - 0.86) / 0.14) : 1;
      const k = p.size * easeOutBack(grow) * (out < 1 ? 1 + (1 - out) * 0.35 : 1) * (out > 0 ? 1 : 0);
      s.visible = true;
      s.position.copy(p.pos);
      s.scale.set(k * squash, k / squash, 1);
      s.material.rotation = p.rot;
      s.material.opacity = out;
    }
  });

  return (
    <group ref={group}>
      {sprites.map((s, i) => <primitive key={i} object={s} />)}
    </group>
  );
}

function easeOutBack(x: number) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
