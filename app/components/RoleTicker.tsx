"use client";

import gsap from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useEffect, useRef } from "react";
import { useMediaQuery, REDUCED_MOTION } from "./useMediaQuery";

gsap.registerPlugin(ScrambleTextPlugin);

/** The previous site's rotating headline (Web Designer / Web Developer / ...), decoded like terminal output. */
export default function RoleTicker({ roles, start }: { roles: readonly string[]; start: boolean }) {
  const el = useRef<HTMLSpanElement>(null);
  const reduced = useMediaQuery(REDUCED_MOTION);

  useEffect(() => {
    if (!start || reduced || !el.current) return;
    const tl = gsap.timeline({ repeat: -1, delay: 1.2 });
    for (let k = 1; k <= roles.length; k++) {
      tl.to(el.current, {
        duration: 1.1,
        scrambleText: { text: roles[k % roles.length], chars: "01<>/{}[]=;", speed: 0.6, revealDelay: 0.25 },
        ease: "none",
      }, "+=2.2");
    }
    return () => { tl.kill(); };
  }, [start, reduced, roles]);

  return <span ref={el} className="grad-text caret">{roles[0]}</span>;
}
