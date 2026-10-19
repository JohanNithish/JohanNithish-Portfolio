"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * Reveals for the sections after the story.
 *  [data-split]   headings rise word by word out of a mask
 *  [data-reveal]  blocks rise + unblur
 *  [data-stagger] children follow one after another
 *  [data-count]   numbers count up
 * Everything starts visible in the HTML; `html.fx` hides it only once this code is running, so nothing can get stuck hidden.
 */
export default function ScrollFx() {
  useGSAP(() => {
    const root = document.documentElement;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      root.classList.add("fx");
      const show = { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.1, ease: "power3.out", overwrite: true };
      const from = { autoAlpha: 0, y: 60, filter: "blur(8px)" };

      ScrollTrigger.batch("[data-reveal]", {
        start: "top 90%", once: true,
        onEnter: (els) => gsap.fromTo(els, from, { ...show, stagger: 0.12 }),
      });
      gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((el) => {
        ScrollTrigger.create({
          trigger: el, start: "top 90%", once: true,
          onEnter: () => gsap.fromTo(el.children, from, { ...show, stagger: 0.13 }),
        });
      });
      const splits = gsap.utils.toArray<HTMLElement>("[data-split]").map((el) => {
        const s = SplitText.create(el, { type: "lines,words", mask: "lines", linesClass: "pb-[0.08em]" });
        gsap.set(s.words, { yPercent: 110 });
        ScrollTrigger.create({
          trigger: el, start: "top 90%", once: true,
          onEnter: () => gsap.to(s.words, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.05 }),
        });
        return s;
      });
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        const o = { v: 0 };
        ScrollTrigger.create({
          trigger: el, start: "top 92%", once: true,
          onEnter: () => gsap.to(o, { v: target, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = String(Math.round(o.v)); } }),
        });
      });
      // section sizes settle after fonts and images load
      const refresh = () => ScrollTrigger.refresh();
      document.fonts?.ready.then(refresh);
      addEventListener("load", refresh);
      return () => {
        root.classList.remove("fx");
        splits.forEach((s) => s.revert());
        removeEventListener("load", refresh);
      };
    });
  });
  return null;
}
