// One layout for the laptop's "work" screen, drawn twice: on the 3D screen (canvas texture) and as real DOM
// (LaptopBrowser) that takes over when the camera has flown into the screen. Same coordinates, same fonts, same
// images, so the hand-over is invisible. Units are texture pixels of the 1024 x 645 screen.

import { projects } from "../../data";

export const SCREEN_W = 1024;
export const SCREEN_H = 645; // matches the 0.292 x 0.184 m screen
export const SCREEN_BG = "#0b1220";

export const L = {
  bar: { h: 38 },
  dots: { y: 19, x: [26, 46, 66], r: 6, colors: ["#f87171", "#fbbf24", "#34d399"] },
  nav: { y: 19, x: [102, 126, 150], size: 18 }, // back, forward, reload
  url: { x: 172, y: 8, w: 420, h: 22, text: "johan.dev/work", size: 12 },
  eyebrow: { x: 56, y: 72, size: 13, text: "02 — LATEST PORTFOLIO" },
  title: { x: 56, y: 94, size: 40, text: "My work & creations" },
  sub: { x: 56, y: 146, size: 15, text: "Click a project to open the live site right here." },
  grid: { x: 56, y: 182, gap: 18, cols: 2, ch: 196, r: 16 },
};

export const CARD_W = (SCREEN_W - L.grid.x * 2 - L.grid.gap) / L.grid.cols;

export function cardRect(i: number) {
  const x = L.grid.x + (i % L.grid.cols) * (CARD_W + L.grid.gap);
  const y = L.grid.y + Math.floor(i / L.grid.cols) * (L.grid.ch + L.grid.gap);
  return { x, y, w: CARD_W, h: L.grid.ch };
}

/** The whole screen always fits in the window (browser bar at the top, bottom row of cards fully visible): full
 *  width with a small overscan that hides the bezel, or full height on very wide windows. The 3D camera (Scene.tsx)
 *  and the HTML copy both use this rule. */
export const OVERSCAN = 0.97;
export function screenFit(vw: number, vh: number) {
  return Math.min(vw / (SCREEN_W * OVERSCAN), vh / SCREEN_H);
}

export const screenProjects = projects;
