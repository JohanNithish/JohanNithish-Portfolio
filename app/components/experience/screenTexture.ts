import * as THREE from "three";
import { profile } from "../../data";
import { cardRect, L, SCREEN_BG as BG, SCREEN_H as H, SCREEN_W as W, screenProjects as projects } from "./screenLayout";

type Token = [string, string];
// a little self-describing component, typed out on the screen
const CODE: Token[][] = [
  [["import", "#c084fc"], [" { Developer } ", "#e2e8f0"], ["from", "#c084fc"], [' "@johan/core"', "#86efac"]],
  [],
  [["export const", "#c084fc"], [" johan", "#7dd3fc"], [" = ", "#e2e8f0"], ["new", "#c084fc"], [" Developer", "#fde68a"], ["({", "#e2e8f0"]],
  [["  name", "#7dd3fc"], [": ", "#e2e8f0"], [`"${profile.name}"`, "#86efac"], [",", "#e2e8f0"]],
  [["  role", "#7dd3fc"], [": ", "#e2e8f0"], ['"Full-Stack Developer"', "#86efac"], [",", "#e2e8f0"]],
  [["  experience", "#7dd3fc"], [": ", "#e2e8f0"], ['"2 years"', "#86efac"], [",", "#e2e8f0"]],
  [["  projects", "#7dd3fc"], [": ", "#e2e8f0"], ["25", "#fca5a5"], [",", "#e2e8f0"]],
  [["  stack", "#7dd3fc"], [": [", "#e2e8f0"], ['"React"', "#86efac"], [", ", "#e2e8f0"], ['"Node"', "#86efac"], [", ", "#e2e8f0"], ['"MySQL"', "#86efac"], ["],", "#e2e8f0"]],
  [["})", "#e2e8f0"]],
  [],
  [["johan", "#7dd3fc"], [".", "#e2e8f0"], ["build", "#fde68a"], ["(", "#e2e8f0"], ['"something great"', "#86efac"], [")", "#e2e8f0"]],
];
const TOTAL_CHARS = CODE.reduce((n, l) => n + l.reduce((m, [t]) => m + t.length, 0) + 1, 0);

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function createScreen() {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false; // glTF UV convention
  texture.anisotropy = 4;

  const images = projects.map((p) => {
    const img = new Image();
    img.onload = () => { if (mode === "work") { drawWork(); texture.needsUpdate = true; } };
    img.src = p.image;
    return img;
  });

  let mode: "code" | "work" = "code";
  let lastDraw = -1;

  function drawCode(t: number) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    // window chrome
    ctx.fillStyle = "#0f1a2c"; ctx.fillRect(0, 0, W, 54);
    ["#f87171", "#fbbf24", "#34d399"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(30 + i * 24, 27, 7, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = BG; roundRect(ctx, 120, 12, 200, 42, 8); ctx.fill();
    ctx.font = "500 20px ui-monospace, Menlo, Consolas, monospace"; ctx.fillStyle = "#cbd5e1"; ctx.fillText("johan.ts", 150, 40);
    // typed code
    const shown = Math.floor((t * 22) % (TOTAL_CHARS + 60));
    ctx.font = "26px ui-monospace, Menlo, Consolas, monospace";
    let count = 0, cx = 0, cy = 0;
    CODE.forEach((line, i) => {
      const y = 104 + i * 44;
      ctx.fillStyle = "#334155"; ctx.fillText(String(i + 1).padStart(2, " "), 26, y);
      let x = 84;
      for (const [text, color] of line) {
        const n = Math.max(0, Math.min(text.length, shown - count));
        if (n > 0) { ctx.fillStyle = color; ctx.fillText(text.slice(0, n), x, y); }
        if (count + text.length >= shown && count <= shown) { cx = x + ctx.measureText(text.slice(0, n)).width; cy = y; }
        x += ctx.measureText(text).width; count += text.length;
      }
      if (count < shown) { cx = x; cy = y; }
      count += 1;
    });
    if (Math.floor(t * 2) % 2 === 0) { ctx.fillStyle = "#22d3ee"; ctx.fillRect(cx + 2, cy - 22, 3, 28); }
    // status bar
    ctx.fillStyle = "#0e7490"; ctx.fillRect(0, H - 34, W, 34);
    ctx.font = "500 18px ui-monospace, Menlo, Consolas, monospace"; ctx.fillStyle = "#ecfeff";
    ctx.fillText("● main   TypeScript   UTF-8", 20, H - 11);
  }

  // the page's own fonts (next/font exposes them as CSS variables), so the canvas matches the DOM copy
  const fam = (v: string, fallback: string) => (getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback);
  document.fonts?.ready.then(() => { if (mode === "work") { drawWork(); texture.needsUpdate = true; } });

  function text(str: string, x: number, y: number, font: string, color: string, spacing = 0) {
    ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = "top";
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    ctx.fillText(str, x, y);
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  }

  /** same layout as ScreenBlock.tsx, coordinate for coordinate */
  function drawWork() {
    const display = fam("--font-display", "system-ui"), body = fam("--font-body", "system-ui"), mono = fam("--font-code", "monospace");
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0f1a2c"; ctx.fillRect(0, 0, W, L.bar.h);
    L.dots.x.forEach((x, i) => { ctx.fillStyle = L.dots.colors[i]; ctx.beginPath(); ctx.arc(x, L.dots.y, L.dots.r, 0, Math.PI * 2); ctx.fill(); });
    ["‹", "›", "↻"].forEach((g, i) => {
      const size = i === 2 ? L.nav.size - 4 : L.nav.size;
      ctx.font = `${size}px ${mono}`; ctx.fillStyle = "#475569"; ctx.textBaseline = "middle"; ctx.textAlign = "center";
      ctx.fillText(g, L.nav.x[i], L.nav.y); ctx.textAlign = "left";
    });
    ctx.fillStyle = BG; roundRect(ctx, L.url.x, L.url.y, L.url.w, L.url.h, L.url.h / 2); ctx.fill();
    text(L.url.text, L.url.x + 14, L.url.y + (L.url.h - L.url.size) / 2, `${L.url.size}px ${mono}`, "#94a3b8");
    text(L.eyebrow.text, L.eyebrow.x, L.eyebrow.y, `${L.eyebrow.size}px ${mono}`, "#22d3ee", L.eyebrow.size * 0.25);
    text(L.title.text, L.title.x, L.title.y, `700 ${L.title.size}px ${display}`, "#eef3f8", -L.title.size * 0.02);
    text(L.sub.text, L.sub.x, L.sub.y, `${L.sub.size}px ${body}`, "#94a3b8");
    projects.forEach((p, i) => {
      const { x, y, w, h } = cardRect(i);
      ctx.save(); roundRect(ctx, x, y, w, h, L.grid.r); ctx.clip();
      ctx.fillStyle = "#111a2b"; ctx.fillRect(x, y, w, h);
      const img = images[i];
      if (img.complete && img.naturalWidth) { // object-fit: cover; object-position: top
        const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
        const dw = img.naturalWidth * s;
        ctx.drawImage(img, x + (w - dw) / 2, y, dw, img.naturalHeight * s);
      }
      const fade = ctx.createLinearGradient(0, y + h * 0.45, 0, y + h);
      fade.addColorStop(0, "rgba(11,18,32,0)"); fade.addColorStop(1, "rgba(11,18,32,0.95)");
      ctx.fillStyle = fade; ctx.fillRect(x, y, w, h);
      text(p.title, x + 18, y + h - 36 - 20, `600 20px ${body}`, "#eef3f8");
      text(p.kind.toUpperCase(), x + 18, y + h - 16 - 11, `11px ${mono}`, "#22d3ee", 11 * 0.18);
      ctx.restore();
    });
  }

  /** redraws at most ~12 times a second */
  function update(t: number, workMode: boolean) {
    const next = workMode ? "work" : "code";
    if (next === mode && next === "work" && lastDraw >= 0 && t - lastDraw < 0.5) return;
    if (next === mode && t - lastDraw < 0.08) return;
    mode = next; lastDraw = t;
    if (mode === "code") drawCode(t); else drawWork();
    texture.needsUpdate = true;
  }

  drawCode(0);
  return { texture, update, dispose: () => texture.dispose() };
}
