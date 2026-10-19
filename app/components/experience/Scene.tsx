"use client";
/* eslint-disable react-hooks/immutability -- the frame loop mutates three.js objects every frame by design */

import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import type { BloomEffect, DepthOfFieldEffect, VignetteEffect } from "postprocessing";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { OVERSCAN, SCREEN_H, SCREEN_W } from "./screenLayout";
import { createScreen } from "./screenTexture";
import PaperPlanes, { planes } from "./PaperPlanes";
import ToolFountain, { fountain } from "./ToolFountain";
import { act2Pose, type Act2Pose, pointSweep, SCREEN_SWAP, smooth, story, storyFrame } from "./story";

RectAreaLightUniformsLib.init();

export const MODEL_URL = "/models/hero.glb";
const FPS = 24;
const DEG = Math.PI / 180;
const BASE_FOV = 30;

// ---------------------------------------------------------------- pointer (head + eye tracking)
const pointer = { x: 0, y: 0, active: false };
function usePointer(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const move = (e: MouseEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.active = true;
    };
    const leave = () => (pointer.active = false);
    window.addEventListener("mousemove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
      pointer.active = false;
    };
  }, [enabled]);
}

// ---------------------------------------------------------------- rig built once from the GLB
type Rig = ReturnType<typeof buildRig>;

function buildRig(gltf: GLTF) {
  const scene = gltf.scene;
  const get = (n: string) => {
    const o = scene.getObjectByName(n);
    if (!o) throw new Error(`hero.glb is missing node ${n}`);
    return o;
  };

  // Blender exported one channel group per node; merge them, then cut the timeline into three clips
  const all = new THREE.AnimationClip("all", -1, gltf.animations.flatMap((a) => a.tracks));
  const node = (t: THREE.KeyframeTrack) => t.name.split(".")[0];
  const sub = (name: string, from: number, to: number, keep: (n: string) => boolean) => {
    const c = THREE.AnimationUtils.subclip(all, name, from, to, FPS);
    c.tracks = c.tracks.filter((t) => keep(node(t)));
    // The exporter collapses constant tracks to their first/last key, which subclip drops when no key falls in
    // range. Put them back as one-key holds, or those bones snap to bind pose (the CC root holds a -90° stand-up).
    const have = new Set(c.tracks.map((t) => t.name));
    for (const t of all.tracks) {
      if (have.has(t.name) || !keep(node(t))) continue;
      const v = (t as unknown as { createInterpolant(): THREE.Interpolant }).createInterpolant().evaluate(from / FPS).slice();
      const Ctor = t.constructor as new (n: string, times: number[], values: number[]) => THREE.KeyframeTrack;
      c.tracks.push(new Ctor(t.name, [0], Array.from(v)));
    }
    c.resetDuration();
    return c;
  };
  const isLid = (n: string) => n === "Laptop_Lid";
  const isTyping = (n: string) => /^(f_(index|middle|ring|pinky)|thumb)0\dR$/.test(n); // right-hand finger bones
  const isBody = (n: string) => !isLid(n) && !n.startsWith("Cam_");
  const mixer = new THREE.AnimationMixer(scene);
  const isRArm = (n: string) => /^(shoulder|upper_arm|forearm|hand|palm0\d)R$/.test(n);
  // the right arm is split out so the intro (opening the lid) can hand over to the story pose seamlessly
  const storyA = mixer.clipAction(sub("story", 0, 200, (n) => !isLid(n) && !isTyping(n) && !isRArm(n)));
  const storyRA = mixer.clipAction(sub("storyR", 0, 200, isRArm));
  const storyRFA = mixer.clipAction(sub("storyRF", 0, 200, isTyping)); // right fingers (typing loop sits on top)
  const introArmA = mixer.clipAction(sub("introArm", 210, 270, (n) => isRArm(n) || isTyping(n)));
  const introA = mixer.clipAction(sub("intro", 210, 270, isLid));
  const typingA = mixer.clipAction(sub("typing", 280, 304, isTyping));
  const walkA = mixer.clipAction(sub("walk", 320, 344, isBody));
  const pointA = mixer.clipAction(sub("point", 420, 444, isBody)); // Resume: scrubbed by scroll
  const callA = mixer.clipAction(sub("call", 450, 498, isBody)); //    Contact: loops
  const carryA = mixer.clipAction(sub("carry", 400, 402, isBody));
  const typeA = mixer.clipAction(sub("type", 410, 412, isBody)); // act 2: laptop open in the left hand, right hand on the keys
  // scrubbed clips: we set their time by hand every frame
  for (const a of [storyA, storyRA, storyRFA, introA, introArmA, walkA, carryA, typeA, pointA]) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); a.paused = true; }
  for (const a of [typingA, callA]) a.play();
  for (const a of [walkA, callA, carryA, typeA, pointA]) a.setEffectiveWeight(0);

  // live screen + the light it throws on the face
  const screen = createScreen();
  const screenMesh = get("Laptop_Screen") as THREE.Mesh;
  const screenMat = new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false, color: 0x000000 });
  screenMesh.material = screenMat;
  screenMesh.geometry.computeBoundingBox();
  const screenCenterLocal = screenMesh.geometry.boundingBox!.getCenter(new THREE.Vector3());
  const pos = screenMesh.geometry.getAttribute("position"), uv = screenMesh.geometry.getAttribute("uv");
  const corner = (score: (u: number, v: number) => number) => {
    let best = 0, bi = 0;
    for (let i = 0; i < uv.count; i++) { const s = score(uv.getX(i), uv.getY(i)); if (i === 0 || s > best) { best = s; bi = i; } }
    return new THREE.Vector3().fromBufferAttribute(pos, bi);
  };
  // uv (0,0) is the texture's top-left (flipY off, glTF convention)
  const screenCorners = { tl: corner((u, v) => -u - v), tr: corner((u, v) => u - v), bl: corner((u, v) => v - u), br: corner((u, v) => u + v) };
  const n = screenMesh.geometry.getAttribute("normal");
  const screenNormalLocal = new THREE.Vector3(n.getX(0), n.getY(0), n.getZ(0)).normalize();
  // lives in the root scene (not the model), because the model itself is moved around in act 2
  const faceLight = new THREE.RectAreaLight(0xcfeaff, 0, 0.3, 0.19);

  // material polish toward a Pixar look: skin with a warm sheen at grazing angles (a cheap stand-in for light
  // scattering through skin), soft velvety cloth, glossy eyes. Lenses hidden: glass reads as a white disc in real time.
  const physical = (m: THREE.MeshStandardMaterial) => {
    const p = new THREE.MeshPhysicalMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(p, m);
    return p;
  };
  const SKIN = /^(Material(.001)?|hand Material)$/;
  scene.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) o.frustumCulled = false; // bind-pose bounds don't follow the animation
    const mesh = o as THREE.Mesh;
    const m = mesh.material as THREE.MeshStandardMaterial | undefined;
    if (!m || !m.name) return;
    if (m.name === "Glasses_Lens") { o.visible = false; return; }
    if (m.name === "Laptop_Logo") m.emissiveIntensity = 2.2;
    if (m.name === "Laptop_KeyGlow") m.emissiveIntensity = 0.8;
    if (/^(Laptop_|Glasses_Metal|Teeth|Cap_Logo)/.test(m.name) || mesh.name.startsWith("Laptop")) return;
    const p = physical(m);
    p.metalness = 0; p.metalnessMap = null;
    if (m.name === "EyesMaterial") { // wet, glossy eyes
      p.roughness = 0.15; p.clearcoat = 1; p.clearcoatRoughness = 0.06;
    } else if (SKIN.test(m.name)) {
      p.roughness = 0.52; p.envMapIntensity = 0.65;
      p.sheen = 0.7; p.sheenRoughness = 0.45; p.sheenColor.set("#ff9f80");
      p.emissive.set("#3a1206"); p.emissiveIntensity = 0.18; // a hint of warm bounce in the shadows
    } else {
      // cloth / hair / cap / shoes: matte with a soft velvet rim (the imported maps make fabric look like chrome)
      p.roughness = Math.max(p.roughness, 0.82); p.envMapIntensity = 0.4;
      p.sheen = 1; p.sheenRoughness = 0.7; p.sheenColor.copy(p.color).lerp(new THREE.Color("#c8d4ff"), 0.45);
    }
    mesh.material = p;
  });

  // blink: the reference face closes its eyes with the "Key 2" + "eyeL_100" shape keys
  const blinkTargets: { mesh: THREE.Mesh; idx: number[] }[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    const d = m.morphTargetDictionary;
    if (m.isMesh && d && ("Key 2" in d || "eyeL_100" in d)) blinkTargets.push({ mesh: m, idx: ["Key 2", "eyeL_100"].filter((k) => k in d).map((k) => d[k]) });
  });

  const logo = get("Laptop_Logo") as THREE.Mesh;
  logo.geometry.computeBoundingBox();
  const logoCenterLocal = logo.geometry.boundingBox!.getCenter(new THREE.Vector3());

  // Character Creator rig bones (names kept from Blender)
  // reference rig (Rigify, names lose their dots in three.js): head = spine006, chest = spine003.
  // It has no eye bones (the eyes are painted on a mesh), so two markers on the head stand in for focus + look.
  const head = get("spine006"), neck = get("spine005"), spine = get("spine003");
  const handR = get("handR");
  scene.updateMatrixWorld(true);
  const eyeBox = new THREE.Box3().setFromObject(get("EYEs001"));
  const eyeL = new THREE.Object3D(), eyeR = new THREE.Object3D();
  for (const [e, x] of [[eyeL, eyeBox.max.x * 0.6], [eyeR, eyeBox.min.x * 0.6]] as const) {
    head.attach(e); e.position.copy(head.worldToLocal(new THREE.Vector3(x, (eyeBox.min.y + eyeBox.max.y) / 2, eyeBox.max.z)));
  }
  return {
    scene, mixer, storyA, storyRA, storyRFA, introArmA, introA, typingA, walkA, pointA, callA, carryA, typeA, screen, screenMesh, screenMat, faceLight,
    screenCenterLocal, screenNormalLocal, screenCorners, logo, logoCenterLocal,
    head, neck, eyeL, eyeR, spine, handR,
    eyeLQ: eyeL.quaternion.clone(), eyeRQ: eyeR.quaternion.clone(),
    // The mixer only writes a property when its animated value changes, so anything we adjust on top
    // (head look, breathing) must be reset to the last clean animated value before each update,
    // otherwise the adjustment compounds every frame (this is what spun the head round).
    headClean: head.quaternion.clone(),
    neckClean: neck.quaternion.clone(),
    spineClean: spine.quaternion.clone(),
    camPos: get("Cam_Pos"), camTarget: get("Cam_Target"),
    blinkTargets, nextBlink: 1.5,
    look: { x: 0, y: 0 },
    walk: { phase: 0, lastX: -3.8, weight: 0 },
    pose: { x: -3.8, yaw: Math.PI / 2, type: 0, lid: 0, point: 0, call: 0 } as Act2Pose,
    lastLid: 0,
  };
}

// scratch objects, reused every frame
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3();
const v5 = new THREE.Vector3(), v6 = new THREE.Vector3(), v7 = new THREE.Vector3(), v8 = new THREE.Vector3();
const v9 = new THREE.Vector3(), v10 = new THREE.Vector3();
const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion(), e1 = new THREE.Euler(0, 0, 0, "YXZ");

/** rotate a bone by a world-space rotation on top of its clean local pose (bone axes in the CC rig are arbitrary) */
function rotateWorld(bone: THREE.Object3D, clean: THREE.Quaternion, world: THREE.Quaternion) {
  bone.parent!.getWorldQuaternion(q2);
  bone.quaternion.copy(q2).invert().multiply(world).multiply(q2).multiply(clean);
}
const focusPoint = new THREE.Vector3(0, 1.3, 0);

function Character({ tracking, onReady }: { tracking: boolean; onReady: () => void }) {
  const gltf = useGLTF(MODEL_URL, "/draco/") as unknown as GLTF;
  const rig = useRef<Rig | null>(null);
  const floor = useRef<THREE.Group>(null);
  const setFrameloop = useThree((s) => s.setFrameloop);
  usePointer(tracking);

  const getThree = useThree((s) => s.get);
  useEffect(() => {
    const r = buildRig(gltf);
    rig.current = r;
    getThree().scene.add(r.faceLight);
    // test builds only: expose the scene to the screenshot scripts
    if (process.env.NEXT_PUBLIC_SHOTS === "1") Object.assign(window, { __story: story, __three: getThree, __rig: r });
    onReady();
    return () => { r.mixer.stopAllAction(); r.screen.dispose(); r.screenMat.dispose(); r.faceLight.removeFromParent(); };
  }, [gltf, onReady, getThree]);

  // stop rendering entirely while the story is scrolled out of view
  useEffect(() => {
    let last = story.visible;
    const id = window.setInterval(() => {
      if (story.visible !== last) { last = story.visible; setFrameloop(last ? "always" : "never"); }
    }, 150);
    return () => window.clearInterval(id);
  }, [setFrameloop]);

  useFrame((state, dt) => {
    const r = rig.current;
    if (!r) return;
    const t = state.clock.elapsedTime;
    const p = story.progress;
    const act2 = story.act === 2;
    const cam = state.camera as THREE.PerspectiveCamera;
    const aspect = state.size.width / state.size.height;

    // ---- restore the clean animated pose, then let the mixer update it
    r.head.quaternion.copy(r.headClean);
    r.neck.quaternion.copy(r.neckClean);
    r.spine.quaternion.copy(r.spineClean);

    let lidOpen: number, screenOn: number, faceLit: number, typing: number;
    if (!act2) {
      // ---- act 1: the scroll-scrubbed story (hero -> about -> turn the laptop -> dive into the screen)
      r.scene.position.set(0, 0, 0);
      r.scene.rotation.set(0, 0, 0);
      r.scene.visible = true;
      r.storyA.time = r.storyRA.time = r.storyRFA.time = storyFrame(p) / FPS;
      r.storyA.setEffectiveWeight(1);
      // intro: the right hand lifts the lid, then hands over to the story as soon as scrolling starts
      const handOver = 1 - smooth(0, 0.03, p);
      r.introArmA.time = (story.lid / 2.5) * r.introArmA.getClip().duration;
      r.introArmA.setEffectiveWeight(handOver);
      r.storyRA.setEffectiveWeight(1 - handOver);
      for (const a of [r.walkA, r.callA, r.carryA, r.typeA, r.pointA]) a.setEffectiveWeight(0);
      lidOpen = story.lid / 2.5;
      fountain.rate = 0; r.lastLid = 0;
      planes.active = false;
      typing = story.typing * (1 - smooth(0.55, 0.6, p));
      r.storyRFA.setEffectiveWeight((1 - handOver) * (1 - typing));
      screenOn = story.power;
      faceLit = 1 - smooth(0.58, 0.7, p);
    } else {
      // ---- act 2: Services / Resume / Contact. He walks between sections, types, points along the timeline, calls.
      const pose = act2Pose(story.act2, r.pose);
      r.scene.visible = story.act2Enabled;
      r.scene.position.set(pose.x, 0, 0);
      r.scene.rotation.set(0, pose.yaw, 0);
      // stride-locked walk: the cycle advances with the distance covered, so feet don't slide
      const dx = Math.abs(pose.x - r.walk.lastX);
      r.walk.lastX = pose.x;
      r.walk.phase = (r.walk.phase + dx / 0.96) % 1; // one cycle = two 0.48 m steps
      const moving = THREE.MathUtils.clamp(dx / Math.max(dt, 1e-3) / 0.35, 0, 1);
      r.walk.weight = THREE.MathUtils.damp(r.walk.weight, moving, 10, dt);
      r.walkA.time = r.walk.phase * r.walkA.getClip().duration;
      const w = r.walk.weight;
      const typeW = pose.type * (1 - w);
      const pointW = pose.point * (1 - w), callW = pose.call * (1 - w);
      r.pointA.time = pointSweep(story.act2) * r.pointA.getClip().duration;
      planes.active = story.act2Enabled && callW > 0.6;
      r.storyA.setEffectiveWeight(0);
      r.storyRA.setEffectiveWeight(0);
      r.storyRFA.setEffectiveWeight(0);
      r.typeA.setEffectiveWeight(typeW);
      r.introArmA.setEffectiveWeight(0);
      r.walkA.setEffectiveWeight(w);
      r.pointA.setEffectiveWeight(pointW);
      r.callA.setEffectiveWeight(callW);
      r.carryA.setEffectiveWeight(Math.max(0, 1 - w - typeW - pointW - callW));
      lidOpen = pose.lid;
      // Services: the moment the lid pops open his tools burst out, then keep pouring while he types
      if (pose.lid > 0.75 && r.lastLid <= 0.75 && story.act2Target < 1.6) fountain.burst = 9;
      r.lastLid = pose.lid;
      fountain.rate = story.act2Enabled && story.act2 < 1.6 ? typeW * smooth(0.8, 1, pose.lid) : 0;
      fountain.lean = pose.x < 0 ? -1.3 : 1.3; // spray away from the text column (and off his face)
      typing = typeW;
      screenOn = pose.lid;
      faceLit = pose.lid * 0.6;
    }
    r.introA.time = 2.5 * lidOpen;
    r.typingA.setEffectiveWeight(typing);
    r.mixer.update(dt);
    r.headClean.copy(r.head.quaternion);
    r.neckClean.copy(r.neck.quaternion);
    r.spineClean.copy(r.spine.quaternion);
    r.scene.updateMatrixWorld();

    // ---- breathing: the chest rocks a fraction of a degree
    // breathing plus a slow, small weight shift so he never freezes on a held pose
    rotateWorld(r.spine, r.spineClean, q1.setFromEuler(e1.set(Math.sin(t * 1.6) * 0.008, Math.sin(t * 0.55) * 0.022, Math.sin(t * 0.4) * 0.01)));

    // blink every 2.5-5.5 s: 70 ms close, 110 ms open (double blink now and then)
    if (t > r.nextBlink + 0.18) r.nextBlink = t + 2.5 + Math.random() * 3 - (Math.random() < 0.15 ? 2.3 : 0);
    const bt = t - r.nextBlink;
    const blink = bt < 0 ? 0 : bt < 0.07 ? bt / 0.07 : bt < 0.18 ? 1 - (bt - 0.07) / 0.11 : 0;
    for (const { mesh, idx } of r.blinkTargets) for (const i of idx) mesh.morphTargetInfluences![i] = blink;
    r.spine.updateMatrixWorld(true);

    // ---- head follows the cursor, on top of the clean animated pose. The turn is shared down the chain
    // (chest 15 %, neck 35 %, head 50 %) so it reads as a real look, not a head pivoting on a stick.
    const lookWeight = act2 ? 1 - r.walk.weight : 1 - smooth(0.6, 0.75, p);
    const follow = tracking && story.introDone && pointer.active && lookWeight > 0.01;
    const k = 1 - Math.pow(1 - 0.06, dt * 60);
    r.look.x += ((follow ? pointer.x * lookWeight : 0) - r.look.x) * k;
    r.look.y += ((follow ? pointer.y * lookWeight : 0) - r.look.y) * k;
    // soft limit: big cursor moves ease into the end of the range instead of hitting a wall
    const yaw = Math.tanh(r.look.x * 1.2) * 36 * DEG, pitch = Math.tanh(r.look.y * 1.2) * (r.look.y < 0 ? 11 : 16) * DEG; // looking down hides the eyes under the cap
    const share = (w: number) => q1.setFromEuler(e1.set(-pitch * w, yaw * w, 0));
    rotateWorld(r.spine, q3.copy(r.spine.quaternion), share(0.15));
    r.spine.updateMatrixWorld(true);
    rotateWorld(r.neck, r.neckClean, share(0.35));
    r.neck.updateMatrixWorld(true);
    rotateWorld(r.head, r.headClean, share(0.5));
    r.head.scale.setScalar(1.06); // Pixar proportions: a slightly bigger head (cap, glasses and beard ride along)
    r.head.updateMatrixWorld(true);
    q1.setFromEuler(e1.set(-pitch * 0.6, yaw * 0.6, 0));
    rotateWorld(r.eyeL, r.eyeLQ, q1);
    rotateWorld(r.eyeR, r.eyeRQ, q1);
    r.scene.updateMatrixWorld();
    if (floor.current) { floor.current.position.x = r.scene.position.x; floor.current.visible = r.scene.visible; }

    // ---- camera: follows the Blender camera rig in act 1, a steady wide shot in act 2
    const fov = aspect < 16 / 9 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan((BASE_FOV / 2) * DEG) * Math.min(16 / 9 / aspect, 2.1))) : BASE_FOV;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.up.set(0, 1, 0);
    if (!act2) {
      r.camPos.getWorldPosition(v1);
      r.camTarget.getWorldPosition(v2);
      const centre = THREE.MathUtils.clamp((1.25 - aspect) / 0.6, 0, 1); // portrait: keep the character centred
      const shift = v2.x * centre * (1 - smooth(0.6, 0.8, p));
      v1.x -= shift; v2.x -= shift;
      // portrait screens: step back during the hero shot so the banner text above and below has room
      const portrait = THREE.MathUtils.clamp((1.05 - aspect) / 0.5, 0, 1);
      const back = story.dolly + 0.6 * portrait * (1 - smooth(0.06, 0.3, p));
      if (back > 0) v1.addScaledVector(v3.subVectors(v1, v2).normalize(), back);
    } else {
      v1.set(0, 1.05, 5.8);
      v2.set(0, 0.95, 0);
    }
    // end of the dive: square up to the screen so it covers the viewport exactly as ScreenBlock (the DOM copy) does,
    // then the page cross-fades to that copy and simply keeps scrolling
    const lock = act2 ? 0 : story.lock; // set by Experience's ticker (keeps running while this loop is paused)
    if (lock > 0) {
      const c = r.screenCorners, M = r.screenMesh.matrixWorld;
      const tl = v3.copy(c.tl).applyMatrix4(M), tr = v4.copy(c.tr).applyMatrix4(M);
      const bl = v5.copy(c.bl).applyMatrix4(M), br = v6.copy(c.br).applyMatrix4(M);
      const w = tl.distanceTo(tr), h = tl.distanceTo(bl);
      const centre = v7.copy(tl).add(br).multiplyScalar(0.5);
      const up = v8.subVectors(tl, bl).normalize();
      const normal = v9.subVectors(tr, tl).cross(up).normalize(); // out of the screen, toward the viewer
      // same rule as screenFit(): full width (minus the overscan), screen top on the viewport's top edge
      // the texture fills slightly less than the mesh's UV corners suggest: measured against the HTML copy at
      // 1440x900 and 1920x1080 (2.7 % larger, ~1.1 % of the screen width lower), identical at both sizes
      const wTex = w / 1.027, hTex = (wTex * SCREEN_H) / SCREEN_W; // the area the texture actually covers
      const viewH = Math.max((OVERSCAN * wTex) / aspect, hTex); // same rule as screenFit(): the whole screen fits
      const d = viewH / 2 / Math.tan((fov / 2) * DEG);
      // wide screens: top-aligned so the browser bar shows; portrait: centred (the live page there is a phone layout)
      centre.addScaledVector(up, (aspect >= 1.2 ? h / 2 - viewH / 2 : 0) - 0.0112 * w);
      const e = lock * lock * (3 - 2 * lock);
      v1.lerp(v10.copy(centre).addScaledVector(normal, d), e);
      v2.lerp(centre, e);
      cam.up.lerp(up, e).normalize();
    }
    cam.position.copy(v1);
    cam.lookAt(v2);

    // ---- screen: content, power flicker, and the light it throws on the face
    r.screen.update(t, !act2 && p > SCREEN_SWAP);
    const power = screenOn * (1 - (1 - story.lock) * (0.03 - 0.03 * Math.sin(t * 50))); // faint refresh shimmer, gone once locked
    r.screenMat.color.setScalar(power);
    r.screenMesh.localToWorld(v1.copy(r.screenCenterLocal));
    v3.copy(r.screenNormalLocal).transformDirection(r.screenMesh.matrixWorld);
    r.faceLight.position.copy(v1).addScaledVector(v3, 0.02);
    fountain.origin.copy(v1).addScaledVector(v3, 0.06).y += 0.12;
    r.handR.getWorldPosition(planes.origin);
    r.faceLight.lookAt(v4.copy(v1).add(v3));
    r.faceLight.intensity = 9 * power * faceLit;

    // ---- focus: logo -> face during the intro, face while reading, then the screen as we dive in; sharp in act 2
    r.logo.localToWorld(v2.copy(r.logoCenterLocal));
    r.eyeL.getWorldPosition(v3); r.eyeR.getWorldPosition(v4); v3.add(v4).multiplyScalar(0.5);
    if (!act2) {
      focusPoint.lerpVectors(v2, v3, story.focus).lerp(v1, smooth(0.6, 0.85, p));
      state.scene.userData.bokeh = THREE.MathUtils.lerp(5.5, 0.4, smooth(0.08, 0.4, p)) * (1 - smooth(0.8, 0.95, p));
    } else {
      focusPoint.copy(v3);
      state.scene.userData.bokeh = 0;
    }
  });

  return (
    <>
      <primitive object={gltf.scene} />
      <ToolFountain />
      <PaperPlanes />
      {/* he stands on something: a soft contact shadow and a pool of light that follow him */}
      <group ref={floor}>
        <ContactShadows position={[0, 0.002, 0]} scale={2.6} blur={2.6} far={1.4} opacity={0.75} resolution={512} color="#000000" frames={Infinity} />
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} renderOrder={-1}>
          <circleGeometry args={[1.6, 64]} />
          <meshBasicMaterial map={poolTexture()} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

let pool: THREE.Texture | null = null;
/** radial cyan-to-nothing gradient for the floor pool */
function poolTexture() {
  if (pool) return pool;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!; const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(34,211,238,0.22)"); grd.addColorStop(0.45, "rgba(34,211,238,0.07)"); grd.addColorStop(1, "rgba(34,211,238,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  pool = new THREE.CanvasTexture(c); pool.colorSpace = THREE.SRGBColorSpace;
  return pool;
}

function Lights() {
  const key = useRef<THREE.DirectionalLight>(null);
  useFrame(() => { if (key.current) key.current.intensity = 2.3 * story.key; });
  return (
    <>
      <ambientLight intensity={0.06} />
      <hemisphereLight args={["#bcd7ff", "#3b2416", 0.35]} />
      <directionalLight ref={key} position={[1.6, 2.4, 2.6]} intensity={0.3} color="#fff1e2" />
      <directionalLight position={[-2.2, 1.0, 2.2]} intensity={0.35} color="#cfe0ff" />
      <directionalLight position={[-2.4, 2.4, -2.4]} intensity={3.4} color="#22d3ee" />
      <directionalLight position={[2.4, 2.0, -2.2]} intensity={2.2} color="#7c8cff" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.2} color="#fff4ea" position={[2, 2.5, 3]} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#22d3ee" position={[-3, 1.5, -2]} scale={[2, 3, 1]} />
        <Lightformer form="ring" intensity={0.6} color="#ffffff" position={[0, 3, 0]} scale={2} />
      </Environment>
    </>
  );
}

function Effects({ dof }: { dof: boolean }) {
  const dofRef = useRef<DepthOfFieldEffect>(null);
  const bloomRef = useRef<BloomEffect>(null);
  const vigRef = useRef<VignetteEffect>(null);
  useFrame((state) => {
    // bloom + vignette fade out as the camera locks onto the screen, so it matches the flat DOM copy
    const k = 1 - story.lock;
    if (bloomRef.current) bloomRef.current.intensity = 0.9 * k;
    if (vigRef.current) vigRef.current.darkness = 0.8 * k;
    const d = dofRef.current;
    if (!d) return;
    d.target?.copy(focusPoint);
    d.bokehScale = (state.scene.userData.bokeh as number | undefined) ?? 5;
  });
  if (!dof) {
    return (
      <EffectComposer multisampling={0}>
        <Bloom ref={bloomRef} intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette ref={vigRef} offset={0.25} darkness={0.8} />
        <Noise opacity={0.025} premultiply />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0}>
      <DepthOfField ref={dofRef} target={[0, 1.3, 0]} worldFocusRange={0.35} bokehScale={5} />
      <Bloom ref={bloomRef} intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette ref={vigRef} offset={0.25} darkness={0.8} />
      <Noise opacity={0.025} premultiply />
    </EffectComposer>
  );
}

export function SceneContents({ tracking, dof, onReady }: { tracking: boolean; dof: boolean; onReady: () => void }) {
  return (
    <>
      <Lights />
      <Character tracking={tracking} onReady={onReady} />
      {!NO_FX && <Effects dof={dof} />}
    </>
  );
}

/** test builds only: `?nofx` renders without postprocessing */
const NO_FX = process.env.NEXT_PUBLIC_SHOTS === "1" && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("nofx");

useGLTF.preload(MODEL_URL, "/draco/");
