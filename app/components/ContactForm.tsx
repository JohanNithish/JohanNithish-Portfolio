"use client";

import { useEffect, useRef, useState } from "react";
import { PLANE_LANDED } from "./experience/story";
import { ArrowUpRight } from "./Icons";

/** No backend: the form composes an email in the visitor's own mail app. */
export default function ContactForm({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const send = useRef<HTMLButtonElement>(null);
  // a paper plane from the character just landed on the button
  useEffect(() => {
    const pulse = () => {
      const b = send.current; if (!b) return;
      b.classList.remove("landed"); void b.offsetWidth; b.classList.add("landed");
    };
    addEventListener(PLANE_LANDED, pulse);
    return () => removeEventListener(PLANE_LANDED, pulse);
  }, []);
  const field =
    "w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-accent/70 focus:bg-white/[0.05]";

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const subject = String(f.get("subject") || "Project enquiry");
        const body = `${f.get("message")}\n\n— ${f.get("name")}${f.get("phone") ? `, ${f.get("phone")}` : ""} (${f.get("email")})`;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setSent(true);
      }}
    >
      <label className="sr-only" htmlFor="c-name">Your name</label>
      <input id="c-name" name="name" required placeholder="Your name" autoComplete="name" className={field} />
      <label className="sr-only" htmlFor="c-email">Your email</label>
      <input id="c-email" name="email" type="email" required placeholder="Your email" autoComplete="email" className={field} />
      <label className="sr-only" htmlFor="c-phone">Phone number</label>
      <input id="c-phone" name="phone" type="tel" placeholder="Phone (optional)" autoComplete="tel" className={field} />
      <label className="sr-only" htmlFor="c-subject">Subject</label>
      <input id="c-subject" name="subject" placeholder="Subject" className={field} />
      <label className="sr-only" htmlFor="c-message">Message</label>
      <textarea id="c-message" name="message" required rows={4} placeholder="Tell me about your project" className={`${field} resize-none sm:col-span-2`} />
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button ref={send} type="submit" className="btn btn-primary">
          Send message <ArrowUpRight className="h-4 w-4" />
        </button>
        <p className="text-xs text-muted" aria-live="polite">{sent ? "Opening your mail app…" : "Opens in your mail app."}</p>
      </div>
    </form>
  );
}
