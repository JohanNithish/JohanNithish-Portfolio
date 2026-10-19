"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { RoughEase } from "gsap/EasePack";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { about, profile, stats } from "../../data";
import RoleTicker from "../RoleTicker";
import { REDUCED_MOTION, TOUCH, useMediaQuery } from "../useMediaQuery";
import LaptopBrowser from "./LaptopBrowser";
import { smooth, story } from "./story";

gsap.registerPlugin(ScrollTrigger, RoughEase, useGSAP);
// keep the intro on real time even when a slow device drops frames (otherwise GSAP stretches it out)
gsap.ticker.lagSmoothing(0);

const Stage = dynamic(() => import("./Stage"), { ssr: false });

/** how long the pinned story lasts, in viewport heights of scrolling */
const STORY_SCROLL = 4.2;

/** `?shot=0.47` freezes the story for screenshots, only in builds made with NEXT_PUBLIC_SHOTS=1 */
const SHOT: number | null =
  process.env.NEXT_PUBLIC_SHOTS === "1" && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("shot")
    ? Number(new URLSearchParams(window.location.search).get("shot"))
    : null;

function LaptopLoader({ pct }: { pct: number }) {
  return (
    <div className="flex flex-col items-center gap-8">
      {/* a closed laptop, lid glowing faintly */}
      <svg viewBox="0 0 220 60" className="w-56" aria-hidden>
        <defs>
          <linearGradient id="lid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#3b414d" />
            <stop offset="1" stopColor="#23272f" />
          </linearGradient>
        </defs>
        <rect x="20" y="22" width="180" height="10" rx="3" fill="url(#lid)" />
        <rect x="8" y="32" width="204" height="9" rx="4" fill="#4b505b" />
        <rect x="88" y="41" width="44" height="3" rx="1.5" fill="#2c3038" />
        <text x="110" y="30.5" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="8" fill="#22d3ee" className="animate-pulse">&lt;/&gt;</text>
      </svg>
      <div className="w-56">
        <div className="h-px w-full bg-white/10">
          <div className="h-px bg-gradient-to-r from-accent to-accent-2 shadow-[0_0_10px_#22d3ee] transition-[width] duration-300" style={{ width: `${Math.max(4, pct)}%` }} />
        </div>
        <div className="mt-3 flex justify-between font-mono text-[10px] tracking-[0.3em] text-muted uppercase">
          <span>Booting</span>
          <span className="text-accent">{String(Math.round(pct)).padStart(3, "0")}%</span>
        </div>
      </div>
    </div>
  );
}

function AboutContent() {
  return (
    <>
      <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-accent uppercase">
        <span className="text-white/40">01</span>
        <span className="h-px w-8 bg-gradient-to-r from-accent to-transparent" />
        About me
      </p>
      <h2 className="mt-3 text-2xl leading-[1.1] font-bold sm:mt-5 sm:text-[2.6rem]">
        Turning ideas into <span className="grad-text">working software</span>
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted sm:mt-5 sm:text-base">{about.body}</p>
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-7 sm:gap-3">
        {stats.map((s) => (
          <div key={s.label} className="glass glow-border rounded-2xl p-4 sm:p-5">
            <p className="grad-text font-display text-3xl font-extrabold sm:text-4xl">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </div>
        ))}
        {about.points.map((p) => (
          <div key={p.title} className="glass rounded-2xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold">{p.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Experience() {
  const reduced = useMediaQuery(REDUCED_MOTION);
  const touch = useMediaQuery(TOUCH);
  const small = useMediaQuery("(max-width: 767px)");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pct, setPct] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const wrap = useRef<HTMLElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const aboutPanel = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);

  const onReady = useCallback(() => setReady(true), []);
  const onProgress = useCallback((n: number) => setPct(n), []);

  // start at the top with scrolling locked until the intro has played
  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = ""; };
  }, []);

  // never trap the visitor: if the 3D scene can't start (no WebGL, very slow network), show the page anyway
  useEffect(() => {
    if (ready) return;
    const bail = window.setTimeout(() => setFailed(true), 20000);
    return () => window.clearTimeout(bail);
  }, [ready]);

  // the intro: laptop opens, the screen flickers on and lights the face, focus racks to the face, text powers on
  useEffect(() => {
    if (!ready && !failed) return;
    const root = document.documentElement;
    const finish = () => {
      story.introDone = true;
      root.dataset.intro = "done";
      root.style.overflow = "";
      ScrollTrigger.refresh();
    };
    const shot = SHOT;
    if (shot !== null) {
      // test builds only: freeze the story at a given progress for screenshots
      Object.assign(story, { lid: 2.5, power: 1, key: 1, focus: 1, dolly: 0, typing: 1, target: shot, progress: shot });
      gsap.set(loader.current, { autoAlpha: 0 });
      const id = window.setTimeout(() => { setRevealed(true); finish(); }, 0);
      return () => window.clearTimeout(id);
    }
    if (reduced || failed) {
      Object.assign(story, { lid: 2.5, power: 1, key: 1, focus: 1, dolly: 0, typing: 1 });
      gsap.set(loader.current, { autoAlpha: 0 });
      const id = window.setTimeout(() => { setRevealed(true); finish(); }, 0);
      return () => window.clearTimeout(id);
    }
    // ~3 s from "loaded" to readable; the page can scroll as soon as the banner lights up
    const unlock = () => { root.style.overflow = ""; setRevealed(true); };
    const tl = gsap.timeline({ onComplete: finish });
    tl.to(loader.current, { autoAlpha: 0, duration: 0.5, ease: "power2.out" })
      .to(story, { dolly: 0, duration: 3.2, ease: "power2.inOut" }, 0)
      .to(story, { lid: 2.5, duration: 1.7, ease: "none" }, 0.2)
      .to(story, { power: 1, duration: 0.8, ease: "rough({ template: power2.out, strength: 3, points: 22, taper: 'out', randomize: true, clamp: true })" }, 1.5)
      .to(story, { key: 1, duration: 1.2, ease: "power2.inOut" }, 1.7)
      .to(story, { focus: 1, duration: 1.1, ease: "power3.inOut" }, 1.8)
      .to(story, { typing: 1, duration: 0.6 }, 2.0)
      .call(unlock, undefined, 2.2);
    return () => { tl.kill(); };
  }, [ready, failed, reduced]);

  // scroll drives the story; overlays read the same smoothed progress as the 3D scene
  useGSAP(() => {
    if (reduced) return;
    if (SHOT === null) ScrollTrigger.create({
      trigger: wrap.current, start: "top top", end: "bottom bottom",
      onUpdate: (s) => (story.target = s.progress),
    });
    const sec = (id: string) => document.getElementById(id);
    const tick = () => {
      // cinematic inertia. Lives here, not in the 3D frame loop, because that loop pauses while the page covers it.
      const k = 1 - Math.exp(-3.2 * Math.min(gsap.ticker.deltaRatio(60) / 60, 0.1));
      story.progress += (story.target - story.progress) * k;
      story.act2 += (story.act2Target - story.act2) * k;
      const p = story.progress;
      story.lock = smooth(0.8, 0.93, p); // camera squares up to the laptop screen at the end of the dive
      const vh = window.innerHeight;

      // which act: once the Work section reaches the top of the screen the story is over
      const work = sec("work")?.getBoundingClientRect();
      if (work && SHOT === null) {
        story.act = work.top < 0 ? 2 : 1;
        story.act2Enabled = window.innerWidth >= 1024;
        // act 2: where are we between Services, Resume and Contact? (section centres vs. screen centre)
        const centreOff = (id: string) => { const r = sec(id)!.getBoundingClientRect(); return r.top + r.height / 2 - vh / 2; };
        const d1 = centreOff("services"), d2 = centreOff("resume");
        const left = document.documentElement.scrollHeight - vh - window.scrollY; // contact may never reach the centre
        const d3 = Math.min(centreOff("contact"), left);
        story.act2Target =
          d1 > 0 ? Math.max(0, 1 - d1 / vh) :
          d2 > 0 ? 1 + -d1 / (-d1 + d2) :
          d3 > 0 ? 2 + -d2 / (-d2 + d3) : 3;
        // nothing to draw while the opaque Work section fills the screen, or in act 2 on phones
        story.visible = !(work.top <= 0 && work.bottom >= vh) && !(story.act === 2 && !story.act2Enabled);
      }
      if (hero.current) hero.current.style.opacity = String(1 - smooth(0.015, 0.09, p));
      if (aboutPanel.current) {
        const a = smooth(0.3, 0.38, p) * (1 - smooth(0.55, 0.61, p));
        aboutPanel.current.style.opacity = String(a);
        aboutPanel.current.style.transform = `translateY(${(1 - a) * 40}px)`;
        aboutPanel.current.style.visibility = a > 0.01 ? "visible" : "hidden";
      }
      // the DOM copy of the laptop screen takes over once the camera has squared up to it
      if (screen.current) {
        const o = smooth(0.935, 0.975, p) * (story.act === 2 ? 1 : smooth(0.9, 1, story.lock)); // act 2 begins as it scrolls away
        screen.current.style.opacity = String(o);
        screen.current.style.visibility = o > 0.001 ? "visible" : "hidden";
      }
      // at the exact moment the Work section reaches the top, its live copy sits where this one is: switch to it
      const workEl = sec("work");
      let inside = story.act === 1 && p > 0.82; // the camera is locking onto the screen
      if (workEl) {
        const r = workEl.getBoundingClientRect();
        const live = r.top <= 0.5 && r.bottom > 1;
        workEl.toggleAttribute("data-live", live);
        inside ||= live;
      }
      // inside the laptop the page is the laptop: the site's nav and rail step aside
      document.documentElement.toggleAttribute("data-inside", inside);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, { dependencies: [reduced], revertOnUpdate: true });

  const flicker = (delay: number) =>
    revealed ? { className: "flicker-in", style: { animationDelay: `${delay}s` } } : { className: "opacity-0", style: {} };

  return (
    <>
      <div ref={loader} className="fixed inset-0 z-[70] grid place-items-center bg-background" role="status" aria-label="Loading">
        <LaptopLoader pct={pct} />
      </div>

      <section id="home" ref={wrap} className="relative" style={{ height: reduced ? "100svh" : `${(STORY_SCROLL + 1) * 100}svh` }}>
        {/* the 3D layer sits behind the whole page: the story here, then the character in the later sections */}
        <div className={`${reduced ? "absolute" : "fixed"} inset-0 -z-10`} aria-hidden>
          <Stage tracking={!reduced && !touch} dof={!small && !touch} onReady={onReady} onProgress={onProgress} />
        </div>
        <div className="sticky top-0 h-svh overflow-hidden">

          {/* hero banner, either side of the laptop. Each side keeps to its outer quarter of the screen (and stacks
              above / below him on narrow screens) so the type never runs into the character. */}
          <div ref={hero} className="pointer-events-none absolute inset-0 z-10">
            <div className="flex h-full flex-col justify-between px-5 pt-22 pb-20 sm:px-10 lg:flex-row lg:items-center lg:px-[4vw] lg:pt-0 lg:pb-0 xl:px-[6vw]">
              <div {...flicker(0)} className={`${flicker(0).className} lg:w-[26vw] lg:max-w-[25rem]`}>
                <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 font-mono text-[10px] tracking-[0.3em] text-accent uppercase">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> Hello! I&apos;m
                </p>
                <h1 className="mt-3 text-[2.1rem] leading-[0.95] font-extrabold whitespace-nowrap uppercase sm:text-6xl lg:text-[clamp(2.3rem,3.7vw,4.2rem)]">
                  Johan
                  <br />
                  Nithish <span className="grad-text">G&nbsp;K</span>
                </h1>
                <p className="mt-2 font-display text-base font-semibold sm:mt-4 sm:text-xl">
                  <RoleTicker roles={profile.roles} start={revealed} />
                </p>
                <p className="mt-1.5 font-mono text-[10px] tracking-[0.25em] text-muted uppercase sm:hidden">Software developer &amp; full-stack engineer</p>
                <p className="mt-4 hidden max-w-[20rem] text-sm leading-relaxed text-muted lg:block">{profile.tagline}</p>
                <div className="pointer-events-auto mt-7 hidden gap-3 lg:flex">
                  <a href="#work" className="btn btn-primary">View projects</a>
                  <a href="#contact" className="btn btn-ghost">Contact</a>
                </div>
              </div>
              <div className={`${flicker(0.35).className} hidden text-right sm:block lg:w-[22vw] lg:max-w-[22rem]`} style={flicker(0.35).style}>
                <p className="font-mono text-[11px] tracking-[0.35em] text-muted uppercase">Software Developer &amp;</p>
                <p className="text-outline-accent mt-2 text-3xl leading-none font-extrabold whitespace-nowrap uppercase sm:text-6xl lg:text-[clamp(2rem,3.3vw,3.7rem)]">Full&#8209;Stack</p>
                <p className="text-3xl leading-none font-extrabold whitespace-nowrap uppercase sm:text-6xl lg:text-[clamp(2rem,3.3vw,3.7rem)]">Engineer</p>
                <div className="mt-6 hidden justify-end gap-8 lg:flex">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <p className="font-display text-2xl font-bold">{s.value}</p>
                      <p className="mt-0.5 font-mono text-[10px] tracking-[0.2em] text-muted uppercase">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {!reduced && (
              <div className={`absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 ${revealed ? "flicker-in" : "opacity-0"}`} style={{ animationDelay: "0.9s" }}>
                <span className="relative block h-8 w-5 rounded-full border border-white/30">
                  <span className="absolute top-1.5 left-1/2 h-1.5 w-0.5 -translate-x-1/2 animate-bounce rounded-full bg-accent" />
                </span>
                <span className="font-mono text-[9px] tracking-[0.4em] text-white/45 uppercase">Scroll</span>
              </div>
            )}
          </div>

          {/* about: right of the standing character (a bottom sheet on phones) */}
          {!reduced && (
            <div
              ref={aboutPanel}
              className="invisible absolute inset-x-4 bottom-4 z-10 max-h-[46svh] overflow-y-auto rounded-3xl border border-white/10 bg-background/80 p-5 opacity-0 backdrop-blur-md md:inset-x-auto md:top-1/2 md:right-[5vw] md:bottom-auto md:max-h-none md:w-[min(520px,42vw)] md:-translate-y-1/2 md:overflow-visible md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
            >
              <AboutContent />
            </div>
          )}

          {/* the dive ends inside the laptop: this DOM copy of its screen replaces the 3D one, then scrolls on into Work */}
          {!reduced && <LaptopBrowser ref={screen} className="invisible absolute inset-0 z-20 opacity-0" />}
        </div>

        {/* nav anchor for the About beat inside the pinned story */}
        {!reduced && <div id="about" aria-hidden className="absolute left-0 h-px w-px" style={{ top: `${STORY_SCROLL * 0.47 * 100}svh` }} />}
      </section>

      {reduced && (
        <section id="about" className="mx-auto max-w-3xl px-5 py-24 sm:px-10">
          <AboutContent />
        </section>
      )}
    </>
  );
}
