"use client";
/* eslint-disable react-hooks/immutability -- the plane pool is mutated every frame by design */

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { PLANE_LANDED } from "./story";

/** Written by the character every frame: his right hand, and whether he is doing the "call me" in Contact. */
export const planes = { origin: new THREE.Vector3(), active: false };


const MAX = 4;
const FLIGHT = 2.6; // seconds from his hand to the form
const EVERY = 2.2; // a new plane this often while he calls
const TRAIL = 22;

/** a folded paper plane, nose along +Z, ~16 cm wingspan */
function planeGeometry() {
  const nose = [0, 0, 0.12], tailL = [-0.08, 0.012, -0.06], tailR = [0.08, 0.012, -0.06], keel = [0, -0.03, -0.05], spine = [0, 0.004, -0.055];
  const v = [
    ...nose, ...spine, ...tailL, //   left wing
    ...nose, ...tailR, ...spine, //   right wing
    ...nose, ...keel, ...spine, //    keel, left face
    ...nose, ...spine, ...keel, //    keel, right face
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

type Plane = { alive: boolean; t: number; p0: THREE.Vector3; p1: THREE.Vector3; p2: THREE.Vector3; p3: THREE.Vector3; trail: THREE.Vector3[]; landed: boolean };

const bez = (o: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, t: number) => {
  const u = 1 - t;
  return o.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
};
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
const m4 = new THREE.Matrix4(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();

/**
 * Paper planes fly out of his "call me" hand, loop once, bank and glide into the contact form's Send button
 * (its real position on screen, unprojected into the scene), leaving a faint trail.
 */
export default function PaperPlanes() {
  const geo = useMemo(() => planeGeometry(), []);
  const meshes = useMemo(() => Array.from({ length: MAX }, () => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: "#f4f8ff", roughness: 0.55, side: THREE.DoubleSide, emissive: "#9fe8ff", emissiveIntensity: 0.25, transparent: true }));
    m.visible = false; return m;
  }), [geo]);
  const trails = useMemo(() => Array.from({ length: MAX }, () => {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.45, depthWrite: false }));
    l.visible = false; l.frustumCulled = false; return l;
  }), []);
  const pool = useMemo<Plane[]>(() => Array.from({ length: MAX }, () => ({
    alive: false, t: 0, landed: false,
    p0: new THREE.Vector3(), p1: new THREE.Vector3(), p2: new THREE.Vector3(), p3: new THREE.Vector3(),
    trail: Array.from({ length: TRAIL }, () => new THREE.Vector3()),
  })), []);
  const clock = useMemo(() => ({ next: 0.6 }), []);

  /** where the Send button is, as a point in the scene a little in front of the character's plane */
  const target = (camera: THREE.Camera, out: THREE.Vector3) => {
    const el = document.querySelector<HTMLElement>("#contact button[type=submit]") ?? document.querySelector<HTMLElement>("#contact");
    const r = el?.getBoundingClientRect();
    const x = r ? ((r.left + r.width / 2) / innerWidth) * 2 - 1 : -0.5, y = r ? -(((r.top + r.height / 2) / innerHeight) * 2 - 1) : -0.2;
    out.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
    const dist = (0.6 - camera.position.z) / out.z; // the z = 0.6 plane, just in front of him
    return out.multiplyScalar(dist).add(camera.position);
  };

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    clock.next -= dt;
    if (planes.active && clock.next <= 0) {
      clock.next = EVERY;
      const p = pool.find((q) => !q.alive);
      if (p) {
        p.alive = true; p.t = 0; p.landed = false;
        p.p0.copy(planes.origin);
        target(state.camera, p.p3);
        // out and up over his head, a loop back, then a long glide in
        p.p1.copy(p.p0).add(v1.set(0.5, 1.1, 0.6));
        p.p2.copy(p.p3).add(v1.set(0.9, 0.9, 0.3));
        p.trail.forEach((t) => t.copy(p.p0));
      }
    }
    pool.forEach((p, i) => {
      const m = meshes[i], line = trails[i];
      if (!p.alive) { m.visible = line.visible = false; return; }
      p.t += dt / FLIGHT;
      if (p.t >= 1) {
        if (!p.landed) { p.landed = true; window.dispatchEvent(new Event(PLANE_LANDED)); }
        p.alive = false; m.visible = line.visible = false; return;
      }
      const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2; // ease in-out
      bez(v1, p.p0, p.p1, p.p2, p.p3, e);
      // a little loop-the-loop in the first third
      const loop = Math.sin(Math.min(1, p.t / 0.38) * Math.PI);
      v1.y += 0.18 * loop; v1.x += 0.12 * Math.sin(Math.min(1, p.t / 0.38) * Math.PI * 2);
      bez(v2, p.p0, p.p1, p.p2, p.p3, Math.min(1, e + 0.02)); v2.y += 0.18 * Math.sin(Math.min(1, (p.t + 0.01) / 0.38) * Math.PI);
      m.position.copy(v1);
      // face along the path, banked into the turns
      m4.lookAt(v2, v1, up); // +Z (the nose) along the direction of travel
      q1.setFromRotationMatrix(m4);
      q2.setFromAxisAngle(v3.set(0, 0, 1), 0.6 * Math.sin(p.t * Math.PI * 2.2));
      m.quaternion.copy(q1).multiply(q2);
      const fadeIn = Math.min(1, p.t / 0.08), fadeOut = p.t > 0.88 ? (1 - p.t) / 0.12 : 1;
      m.scale.setScalar(1.8 * fadeIn * (0.5 + 0.5 * fadeOut));
      (m.material as THREE.MeshStandardMaterial).opacity = fadeOut;
      m.visible = true;
      // trail
      for (let k = TRAIL - 1; k > 0; k--) p.trail[k].copy(p.trail[k - 1]);
      p.trail[0].copy(v1);
      const pos = line.geometry.getAttribute("position") as THREE.BufferAttribute;
      p.trail.forEach((t, k) => pos.setXYZ(k, t.x, t.y, t.z));
      pos.needsUpdate = true;
      (line.material as THREE.LineBasicMaterial).opacity = 0.4 * fadeOut;
      line.visible = true;
    });
  });

  return (
    <group>
      {meshes.map((m, i) => <primitive key={`m${i}`} object={m} />)}
      {trails.map((l, i) => <primitive key={`l${i}`} object={l} />)}
    </group>
  );
}
