"use client";

import { useEffect, useRef, useState } from "react";
import { nav, profile } from "../data";
import { socialIcon } from "./Icons";

/** Floating glass nav: highlights the section on screen, a hairline shows scroll progress, menu sheet on phones. */
export default function Nav() {
  const [active, setActive] = useState("#home");
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      // the last section whose top has passed the upper third of the screen
      let current = "#home";
      for (const n of nav) {
        const el = document.querySelector(n.href);
        if (el && el.getBoundingClientRect().top < innerHeight * 0.35) current = n.href;
      }
      setActive(current);
      setStuck(scrollY > 24);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <header className="after-intro fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav data-stuck={stuck ? "" : undefined} className="nav-bar mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full pr-2 pl-5" aria-label="Main">
        <a href="#home" className="font-mono text-[15px] font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <span className="text-accent">&lt;</span>JN<span className="text-accent">/&gt;</span>
        </a>
        <ul className="hidden items-center gap-1 font-mono text-[11px] tracking-[0.2em] uppercase md:flex">
          {nav.map((n) => (
            <li key={n.href}>
              <a
                href={n.href}
                aria-current={active === n.href ? "true" : undefined}
                className={`relative rounded-full px-3.5 py-2 transition-colors ${active === n.href ? "bg-white/[0.07] text-accent" : "text-white/60 hover:text-white"}`}
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a href="#contact" className="btn btn-primary hidden !px-5 !py-2.5 text-xs sm:inline-flex">Hire me</a>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 h-px w-4 bg-white transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute top-1.5 left-0 h-px w-4 bg-white transition ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 h-px w-4 bg-white transition ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
        <div className="absolute inset-x-6 bottom-0 h-px origin-left overflow-hidden">
          <div ref={bar} className="h-px origin-left scale-x-0 bg-gradient-to-r from-accent via-accent-2 to-accent-3" />
        </div>
      </nav>

      {/* phone menu sheet */}
      <div className={`glass mx-auto mt-2 max-w-6xl bg-background/95 overflow-hidden rounded-3xl transition-all duration-500 md:hidden ${open ? "max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}>
        <ul className="flex flex-col p-3">
          {nav.map((n) => (
            <li key={n.href}>
              <a href={n.href} onClick={() => setOpen(false)} className={`block rounded-2xl px-4 py-3 font-display text-lg ${active === n.href ? "text-accent" : "text-white/80"}`}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex gap-4 border-t border-white/8 px-7 py-4">
          {profile.socials.map(({ label, href, icon }) => {
            const Icon = socialIcon[icon];
            return <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="text-white/60 hover:text-accent"><Icon className="h-5 w-5" /></a>;
          })}
        </div>
      </div>
    </header>
  );
}
