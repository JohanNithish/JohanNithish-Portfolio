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
  [["  experience", "#7dd3fc"], [": ", "#e2e8f0"], ['"3+ years"', "#86efac"], [",", "#e2e8f0"]],
  [["  projects", "#7dd3fc"], [": ", "#e2e8f0"], ["30", "#fca5a5"], [",", "#e2e8f0"]],
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

  let mode: "code" | "work" | "contact" = "code";
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

  // ---------------------------------------------------------------- contact: a chat that writes itself
  // Drawn big and graphic, because the camera sees it from a few metres away. One cycle: his bubble pops up, a reply
  // types itself, the send button flashes and the message flies off the screen as a paper plane (update() -> true).
  const CHAT = { cycle: 4.8, hello: "Got a project?", reply: "Let's talk!", send: 2.7 };
  let chatStart = -1, lastPhase = 0;
  function bubble(x: number, y: number, w: number, h: number, fill: string, tailLeft: boolean) {
    ctx.fillStyle = fill; roundRect(ctx, x, y, w, h, 34); ctx.fill();
    ctx.beginPath();
    if (tailLeft) { ctx.moveTo(x + 18, y + h - 22); ctx.lineTo(x - 14, y + h + 6); ctx.lineTo(x + 52, y + h - 6); }
    else { ctx.moveTo(x + w - 18, y + h - 22); ctx.lineTo(x + w + 14, y + h + 6); ctx.lineTo(x + w - 52, y + h - 6); }
    ctx.fill();
  }
  function drawContact(t: number) {
    const display = fam("--font-display", "system-ui"), body = fam("--font-body", "system-ui");
    if (chatStart < 0) chatStart = t;
    const c = (t - chatStart) % CHAT.cycle;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0e1a2e"); g.addColorStop(1, BG);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // header: avatar, name, online dot
    ctx.fillStyle = "#0f1a2c"; ctx.fillRect(0, 0, W, 96);
    ctx.fillStyle = "#22d3ee"; ctx.beginPath(); ctx.arc(70, 48, 30, 0, Math.PI * 2); ctx.fill();
    text("JN", 70 - 20, 48 - 15, `800 30px ${display}`, "#0b1220");
    text("Johan", 120, 22, `700 30px ${display}`, "#eef3f8");
    ctx.fillStyle = "#34d399"; ctx.beginPath(); ctx.arc(128, 70, 7, 0, Math.PI * 2); ctx.fill();
    text("online · replies fast", 144, 60, `20px ${body}`, "#94a3b8");
    // his bubble pops in
    const pop = Math.min(1, c / 0.35), sc = pop < 1 ? 1.18 * pop - 0.18 * pop * pop * pop : 1;
    ctx.save(); ctx.translate(60, 150); ctx.scale(sc, sc);
    ctx.font = `700 58px ${body}`; const hw = ctx.measureText(CHAT.hello).width + 34 * 2 + 74;
    bubble(0, 0, hw, 112, "#1e293b", true);
    text("👋", 30, 24, `58px ${body}`, "#fff");
    text(CHAT.hello, 34 + 74, 26, `700 58px ${body}`, "#eef3f8");
    ctx.restore();
    // the reply types itself into the input, then becomes a bubble once sent
    const typed = c < 0.7 ? 0 : Math.min(CHAT.reply.length, Math.floor((c - 0.7) / (CHAT.send - 0.9) * CHAT.reply.length));
    const sent = c >= CHAT.send;
    if (sent) {
      const k = Math.min(1, (c - CHAT.send) / 0.3);
      ctx.font = `700 58px ${body}`; const rw = ctx.measureText(CHAT.reply).width + 68;
      ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 60);
      bubble(W - 60 - rw, 300, rw, 112, "#22d3ee", false);
      text(CHAT.reply, W - 60 - rw + 34, 300 + 26, `700 58px ${body}`, "#0b1220");
      text("✓✓ sent", W - 60 - 150, 426, `26px ${body}`, "#67e8f9");
      ctx.restore();
    }
    // input + send button
    ctx.fillStyle = "#111c30"; roundRect(ctx, 40, H - 132, W - 220, 92, 46); ctx.fill();
    const shown = sent ? "" : CHAT.reply.slice(0, typed);
    text(shown || (sent ? "Write to me…" : ""), 84, H - 108, `700 52px ${body}`, shown ? "#eef3f8" : "#475569");
    if (!sent && Math.floor(t * 2.5) % 2 === 0) {
      ctx.font = `700 52px ${body}`; const cx = 84 + ctx.measureText(shown).width + 4;
      ctx.fillStyle = "#22d3ee"; ctx.fillRect(cx, H - 110, 4, 46);
    }
    const flash = Math.max(0, 1 - Math.abs(c - CHAT.send) / 0.25);
    const ready = typed >= CHAT.reply.length || sent;
    ctx.fillStyle = flash > 0 ? `rgba(165,243,252,${0.6 + 0.4 * flash})` : ready ? "#22d3ee" : "#164e63";
    ctx.beginPath(); ctx.arc(W - 110, H - 86, 54 + 10 * flash, 0, Math.PI * 2); ctx.fill();
    // a paper plane glyph on the button
    ctx.save(); ctx.translate(W - 110, H - 86); ctx.rotate(-0.35); ctx.fillStyle = "#0b1220";
    ctx.beginPath(); ctx.moveTo(-26, -2); ctx.lineTo(28, -18); ctx.lineTo(-6, 22); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    const fired = lastPhase < CHAT.send && c >= CHAT.send;
    lastPhase = c;
    return fired;
  }

  /** redraws at most ~12 times a second (the chat at ~25). Returns true the moment the chat sends a message. */
  function update(t: number, next: "code" | "work" | "contact") {
    if (next !== "contact") chatStart = -1;
    if (next === mode && next === "work" && lastDraw >= 0 && t - lastDraw < 0.5) return false;
    if (next === mode && t - lastDraw < (next === "contact" ? 0.04 : 0.08)) return false;
    mode = next; lastDraw = t;
    let fired = false;
    if (mode === "code") drawCode(t); else if (mode === "work") drawWork(); else fired = drawContact(t);
    texture.needsUpdate = true;
    return fired;
  }

  drawCode(0);
  return { texture, update, dispose: () => texture.dispose() };
}
