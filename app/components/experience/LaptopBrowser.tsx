"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "../Icons";
import { useMediaQuery } from "../useMediaQuery";
import { cardRect, L, SCREEN_BG, SCREEN_H, SCREEN_W, screenFit, screenProjects as projects } from "./screenLayout";

type Props = {
  /** live = the working page in the Work section; otherwise the static copy that fades in over the 3D screen */
  live?: boolean;
  className?: string;
};

const HOME = -1;
const host = (href: string) => new URL(href).hostname.replace(/^www\./, "");

/**
 * The laptop's screen as a small working browser. Its home view is laid out on the same 1024 x 645 grid as the 3D
 * screen texture (screenLayout.ts) and scaled exactly the way the camera frames the 3D screen, so the 3D -> HTML
 * hand-over is seamless. Clicking a project opens the live site inside the window; back / forward / reload / open in
 * a new tab all work. An embedded site only takes the mouse after a click, so it never swallows page scrolling.
 */
const LaptopBrowser = forwardRef<HTMLDivElement, Props>(function LaptopBrowser({ live = false, className = "" }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const portrait = useMediaQuery("(max-aspect-ratio: 6/5)");
  const [history, setHistory] = useState<number[]>([HOME]);
  const [pos, setPos] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [active, setActive] = useState(false);
  const [reloads, setReloads] = useState(0);
  const cur = history[pos];
  const project = cur === HOME ? null : projects[cur];

  // keep the virtual 1024 x 645 page scaled to the viewport exactly like the 3D camera frames the screen
  useEffect(() => {
    const fit = () => box.current?.style.setProperty("--fit", String(screenFit(window.innerWidth, window.innerHeight)));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  // a site that refuses to be embedded never fires a useful load event: offer the new-tab link after a while
  useEffect(() => {
    if (cur === HOME) return;
    const id = window.setTimeout(() => setSlow(true), 9000);
    return () => window.clearTimeout(id);
  }, [cur, reloads]);

  const visit = useCallback((i: number) => {
    setHistory((h) => [...h.slice(0, pos + 1), i]);
    setPos((p) => p + 1);
    setLoaded(false); setSlow(false); setActive(false);
  }, [pos]);
  const go = (d: number) => {
    const n = pos + d;
    if (n < 0 || n >= history.length) return;
    setPos(n); setLoaded(false); setSlow(false); setActive(false);
  };
  const reload = () => { if (cur !== HOME) { setReloads((r) => r + 1); setLoaded(false); setSlow(false); } };

  const url = project ? `${host(project.href)}` : L.url.text;
  const canBack = pos > 0, canFwd = pos < history.length - 1;

  // ------------------------------------------------------------------ the open site (shared by both layouts)
  const viewer = project && (
    <div className="absolute inset-0 overflow-hidden bg-white" onMouseLeave={() => setActive(false)}>
      {/* the screenshot stands in while the real site loads */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={project.image} alt="" className={`absolute inset-0 h-full w-full object-cover object-top transition duration-700 ${loaded ? "opacity-0" : "opacity-100 blur-[2px]"}`} />
      <iframe
        key={`${cur}-${reloads}`}
        src={project.href}
        title={`${project.title} (live site)`}
        className={`absolute inset-0 h-full w-full border-0 bg-white transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
      {!active && (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="absolute inset-0 flex items-end justify-center bg-transparent pb-6"
          aria-label={`Interact with ${project.title}`}
        >
          <span className="rounded-full bg-[#0b1220]/85 px-4 py-2 font-mono text-[11px] tracking-[0.15em] text-white/85 uppercase shadow-lg backdrop-blur">
            {loaded ? "Click to use the site · scroll to keep going" : "Loading live site…"}
          </span>
        </button>
      )}
      {(slow && !loaded) && (
        <div className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-2xl bg-[#0b1220]/90 p-5 text-center text-white shadow-2xl">
          <p className="text-sm">This site doesn&apos;t allow being shown inside another page.</p>
          <a href={project.href} target="_blank" rel="noreferrer" className="btn btn-primary mt-3 !py-2 text-xs">Open {host(project.href)} <ArrowUpRight className="h-3.5 w-3.5" /></a>
        </div>
      )}
    </div>
  );

  const navBtn = (label: string, glyph: string, onClick: () => void, enabled: boolean, style?: React.CSSProperties, cls = "") => (
    <button
      type="button"
      aria-label={label}
      tabIndex={live ? 0 : -1}
      disabled={!live || !enabled}
      onClick={onClick}
      className={`absolute grid place-items-center rounded-md font-mono leading-none transition ${enabled && live ? "text-[#94a3b8] hover:bg-white/10 hover:text-white" : "text-[#475569]"} ${cls}`}
      style={style}
    >
      {glyph}
    </button>
  );

  // ------------------------------------------------------------------ phones (live only): a normal responsive page
  if (live && portrait) {
    return (
      <div ref={ref} className={`flex h-full flex-col ${className}`} style={{ background: SCREEN_BG }}>
        <div ref={box} className="flex h-12 shrink-0 items-center gap-1.5 bg-[#0f1a2c] px-3">
          {[["Back", "‹", () => go(-1), canBack], ["Forward", "›", () => go(1), canFwd], ["Reload", "↻", reload, cur !== HOME]].map(([l, g, f, e]) => (
            <button key={l as string} type="button" aria-label={l as string} disabled={!e} onClick={f as () => void} className={`grid h-8 w-8 place-items-center rounded-md text-lg ${e ? "text-white/80" : "text-white/25"}`}>{g as string}</button>
          ))}
          <span className="ml-1 min-w-0 flex-1 truncate rounded-full px-3 py-1 font-mono text-xs text-[#94a3b8]" style={{ background: SCREEN_BG }}>{url}</span>
          {project && <a href={project.href} target="_blank" rel="noreferrer" aria-label="Open in new tab" className="grid h-8 w-8 place-items-center text-white/80"><ArrowUpRight className="h-4 w-4" /></a>}
        </div>
        <div className="relative flex-1 overflow-hidden">
          {viewer ?? (
            <div className="h-full overflow-y-auto px-5 pt-24 pb-10">
              <p className="font-mono text-[11px] tracking-[0.25em] text-accent">{L.eyebrow.text}</p>
              <h2 className="mt-3 text-3xl font-bold">{L.title.text}</h2>
              <p className="mt-2 text-sm text-[#94a3b8]">{L.sub.text}</p>
              <div className="mt-6 grid gap-4">
                {projects.map((p, i) => (
                  <button key={p.href} type="button" onClick={() => visit(i)} className="relative block aspect-[16/9] overflow-hidden rounded-2xl bg-[#111a2b] text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
                    <span className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-[#0b1220]" />
                    <span className="absolute bottom-8 left-4 font-semibold">{p.title}</span>
                    <span className="absolute bottom-3 left-4 font-mono text-[10px] tracking-[0.18em] text-accent uppercase">{p.kind}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ the virtual 1024 x 645 screen
  return (
    <div ref={ref} className={`overflow-hidden ${className}`} style={{ background: SCREEN_BG }}>
      <div
        ref={box}
        className={`absolute left-1/2 ${portrait ? "top-1/2" : "top-0"}`}
        style={{
          width: SCREEN_W,
          // the live page fills the viewport height; the copy over the 3D screen is the screen itself
          height: live ? "calc(100svh / var(--fit, 1))" : SCREEN_H,
          // same framing as the camera: top-aligned on wide screens, centred on portrait ones
          transform: portrait ? "translate(-50%, -50%) scale(var(--fit, 1))" : "translateX(-50%) scale(var(--fit, 1))",
          transformOrigin: portrait ? "center" : "top center",
        }}
      >
        {/* browser chrome */}
        <div className="absolute inset-x-0 top-0 bg-[#0f1a2c]" style={{ height: L.bar.h }} />
        {L.dots.x.map((x, i) => (
          <span key={x} className="absolute rounded-full" style={{ left: x - L.dots.r, top: L.dots.y - L.dots.r, width: L.dots.r * 2, height: L.dots.r * 2, background: L.dots.colors[i] }} />
        ))}
        {navBtn("Back", "‹", () => go(-1), canBack, { left: L.nav.x[0] - 11, top: L.nav.y - 11, width: 22, height: 22, fontSize: L.nav.size })}
        {navBtn("Forward", "›", () => go(1), canFwd, { left: L.nav.x[1] - 11, top: L.nav.y - 11, width: 22, height: 22, fontSize: L.nav.size })}
        {navBtn("Reload", "↻", reload, cur !== HOME, { left: L.nav.x[2] - 11, top: L.nav.y - 11, width: 22, height: 22, fontSize: L.nav.size - 4 })}
        <span className="absolute flex items-center rounded-full font-mono text-[#94a3b8]" style={{ left: L.url.x, top: L.url.y, width: L.url.w, height: L.url.h, background: SCREEN_BG, fontSize: L.url.size, paddingLeft: 14, lineHeight: 1 }}>
          {url}
        </span>
        {project && live && (
          <a href={project.href} target="_blank" rel="noreferrer" className="absolute flex items-center gap-1.5 rounded-full px-3 font-mono text-[11px] text-accent hover:bg-white/10" style={{ left: L.url.x + L.url.w + 12, top: L.url.y, height: L.url.h }}>
            Open in new tab <ArrowUpRight className="h-3 w-3" />
          </a>
        )}

        {/* page */}
        <div className="absolute inset-x-0 bottom-0" style={{ top: L.bar.h }}>
          {viewer}
        </div>
        {!project && (
          <>
            <p className="absolute font-mono text-accent" style={{ left: L.eyebrow.x, top: L.eyebrow.y, fontSize: L.eyebrow.size, letterSpacing: "0.25em", lineHeight: 1 }}>{L.eyebrow.text}</p>
            <h2 className="absolute font-bold whitespace-nowrap text-[#eef3f8]" style={{ left: L.title.x, top: L.title.y, fontSize: L.title.size, lineHeight: 1, letterSpacing: "-0.02em" }}>{L.title.text}</h2>
            <p className="absolute text-[#94a3b8]" style={{ left: L.sub.x, top: L.sub.y, fontSize: L.sub.size, lineHeight: 1 }}>{L.sub.text}</p>
            {projects.map((p, i) => {
              const r = cardRect(i);
              return (
                <div key={p.href} className="group absolute" style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
                  <button
                    type="button"
                    tabIndex={live ? 0 : -1}
                    disabled={!live}
                    onClick={() => visit(i)}
                    aria-label={`Open ${p.title}`}
                    className="absolute inset-0 overflow-hidden bg-[#111a2b] text-left transition duration-300 enabled:hover:-translate-y-1 enabled:hover:shadow-[0_18px_50px_-12px_rgba(34,211,238,0.45)]"
                    style={{ borderRadius: L.grid.r }}
                  >
                    {/* plain img: must match the canvas copy pixel for pixel */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.04]" />
                    <span className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(11,18,32,0) 45%, rgba(11,18,32,0.95) 100%)" }} />
                    <span className="absolute font-semibold text-[#eef3f8]" style={{ left: 18, bottom: 36, fontSize: 20, lineHeight: 1 }}>{p.title}</span>
                    <span className="absolute font-mono text-accent uppercase" style={{ left: 18, bottom: 16, fontSize: 11, letterSpacing: "0.18em", lineHeight: 1 }}>{p.kind}</span>
                  </button>
                  {live && (
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${p.title} in a new tab`}
                      className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-[#0b1220]/80 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-accent hover:text-[#0b1220] focus-visible:opacity-100"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
});

export default LaptopBrowser;
