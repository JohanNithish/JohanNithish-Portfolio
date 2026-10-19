// Shared, mutable state for the cinematic. GSAP (DOM side) writes it, the R3F frame loop reads it,
// so nothing here triggers a React render.

export const story = {
  /** scroll progress through the pinned story, 0 = hero, 1 = zoomed into the screen */
  target: 0,
  /** smoothed copy of `target`, what the scene actually shows */
  progress: 0,
  /** intro: seconds into the lid-opening clip (0 closed .. 2.5 open) */
  lid: 0,
  /** screen + face light power, 0..1 (flickers on) */
  power: 0,
  /** key light level during the intro, 0..1 */
  key: 0.15,
  /** rack focus: 0 = laptop logo, 1 = face */
  focus: 0,
  /** extra camera distance at the start of the intro (slow push-in) */
  dolly: 0.35,
  /** typing loop weight */
  typing: 0,
  /** true once the intro has finished (enables mouse tracking) */
  introDone: false,
  /** the scene stops rendering while it is scrolled out of view */
  visible: true,
  /** 1 = the opening story, 2 = the character in Services / Resume / Contact */
  act: 1 as 1 | 2,
  /** act 2 position: 0 = entering Services, 1 = Services, 2 = Resume, 3 = Contact (target + smoothed) */
  act2Target: 0,
  act2: 0,
  /** act 2 is desktop-only; on phones the later sections are text only */
  act2Enabled: true,
  /** 0..1 the camera squares up to the laptop screen at the end of the dive */
  lock: 0,
  /** 0..1 colour fringing while we pass through the screen glass */
  fringe: 0,
  /** the laptop screen's corners on the page (tl, tr, br, bl as x, y pairs in CSS px), written by the scene */
  screenQuad: [0, 0, 0, 0, 0, 0, 0, 0] as number[],
};

/** Act 2 choreography. x = where he stands (scene units, + is screen right), yaw = which way he faces
 *  (0 = camera, + turns him toward screen right), type = laptop open in one hand, typing with the other,
 *  lid = laptop open, point = pointing down the timeline (the sweep follows the scroll), call = holding the open
 *  laptop out to you (Contact).
 *  He walks whenever x changes.
 *  Services: walks in and types, his tools pour out · Resume: walks across, points you down the timeline ·
 *  Contact: shows you the laptop, where a chat writes itself and "sends" paper planes into the contact form. */
export type Act2Pose = { x: number; yaw: number; type: number; lid: number; point: number; call: number };
const WALK_RIGHT = Math.PI / 2;
const P = (x: number, yaw: number, type = 0, lid = 0, point = 0, call = 0): Act2Pose => ({ x, yaw, type, lid, point, call });
const ACT2: [number, Act2Pose][] = [
  [0.0, P(-3.8, WALK_RIGHT)], //              off-screen left
  [0.62, P(-1.55, WALK_RIGHT)], //            walks in beside Services
  [0.74, P(-1.55, 0.42)], //                  turns toward the cards
  [0.88, P(-1.55, 0.42, 1, 1)], //            opens the laptop and types: his tools pour out
  [1.34, P(-1.55, 0.42, 1, 1)],
  [1.44, P(-1.55, 0.42)], //                  closes it
  [1.5, P(-1.55, WALK_RIGHT)], //             turns to walk across, in the gap between the two sections
  [1.82, P(1.55, WALK_RIGHT)], //             arrives beside Resume
  [1.92, P(1.55, -0.62, 0, 0, 1)], //         turns to the timeline and points along it
  [2.5, P(1.55, -0.62, 0, 0, 1)],
  [2.66, P(1.55, -0.22, 0, 1, 0, 1)], //      Contact: holds the open laptop out to you; its chat sends planes
  [3.0, P(1.55, -0.22, 0, 1, 0, 1)],
];
/** how far down the timeline he is pointing, 0 (top) .. 1 (bottom), as you scroll through Resume */
export const pointSweep = (a: number) => clamp01((a - 1.9) / 0.6);
export function act2Pose(a: number, out: Act2Pose): Act2Pose {
  const last = ACT2[ACT2.length - 1];
  if (a >= last[0]) return Object.assign(out, last[1]);
  for (let i = 1; i < ACT2.length; i++) {
    const [a1, k1] = ACT2[i];
    const [a0, k0] = ACT2[i - 1];
    if (a > a1) continue;
    const t = clamp01((a - a0) / (a1 - a0));
    const s = t * t * (3 - 2 * t);
    out.x = k0.x + (k1.x - k0.x) * t; // linear, so the walking pace is steady
    out.yaw = k0.yaw + (k1.yaw - k0.yaw) * s;
    out.type = k0.type + (k1.type - k0.type) * s;
    out.lid = k0.lid + (k1.lid - k0.lid) * s;
    out.point = k0.point + (k1.point - k0.point) * s;
    out.call = k0.call + (k1.call - k0.call) * s;
    return out;
  }
  return Object.assign(out, ACT2[0][1]);
}

/** scroll progress -> Story clip frame (24 fps). Holds give the reader time on each beat. */
const BEATS: [number, number][] = [
  [0, 0], [0.08, 20], [0.4, 100], [0.55, 118], [0.8, 165], [1, 200],
];
export function storyFrame(p: number) {
  for (let i = 1; i < BEATS.length; i++) {
    const [p1, f1] = BEATS[i];
    const [p0, f0] = BEATS[i - 1];
    if (p <= p1) return f0 + ((p - p0) / (p1 - p0)) * (f1 - f0);
  }
  return 200;
}

/** fired on window when one of his paper planes lands on the Send button, so it can pulse */
export const PLANE_LANDED = "paper-plane-landed";

/** Passing through the laptop screen at the end of the dive (story progress p):
 *  glint = a reflection sweeping across the glass, 0..1 position · pixels = so close the RGB sub-pixels show and the
 *  image splits into colour fringes · settle = the HTML page coming into focus. All 0 outside the dive. */
export function throughGlass(p: number) {
  const glint = smooth(0.84, 0.935, p);
  const pixels = smooth(0.905, 0.945, p) * (1 - smooth(0.952, 0.985, p));
  const settle = smooth(0.94, 0.985, p);
  return { glint, glintOn: smooth(0.84, 0.87, p) * (1 - smooth(0.915, 0.94, p)), pixels, settle };
}

export function clamp01(x: number) { return Math.min(1, Math.max(0, x)); }
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** where the work-mode screen takes over (the screen faces away mid-turn, so the swap is hidden) */
export const SCREEN_SWAP = 0.67;
