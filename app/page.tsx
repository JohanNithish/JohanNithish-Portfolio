import { preload } from "react-dom";
import ContactForm from "./components/ContactForm";
import Experience from "./components/experience/Experience";
import LaptopBrowser from "./components/experience/LaptopBrowser";
import { MailIcon, PhoneIcon, PinIcon, socialIcon } from "./components/Icons";
import Nav from "./components/Nav";
import ScrollFx from "./components/ScrollFx";
import { education, experience, profile, services } from "./data";

function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-accent uppercase">
      <span className="text-white/40">{n}</span>
      <span className="h-px w-8 bg-gradient-to-r from-accent to-transparent" />
      {children}
    </p>
  );
}

function Socials({ vertical = false }: { vertical?: boolean }) {
  return (
    <ul className={`flex gap-5 ${vertical ? "flex-col" : ""}`}>
      {profile.socials.map(({ label, href, icon }) => {
        const Icon = socialIcon[icon];
        return (
          <li key={label}>
            <a href={href} target="_blank" rel="noreferrer" aria-label={label} className="block text-white/55 transition hover:text-accent">
              <Icon className="h-[18px] w-[18px]" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** a slow band of outline words between sections, as on the previous site's banner */
function Marquee({ words }: { words: string[] }) {
  const row = [...words, ...words];
  return (
    <div aria-hidden className="relative overflow-hidden border-y border-white/[0.06] bg-background/60 py-6 backdrop-blur-sm">
      <div className="marquee">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {row.map((w, i) => (
              <span key={`${k}-${i}`} className="flex items-center font-display text-4xl font-extrabold tracking-tight whitespace-nowrap uppercase sm:text-6xl">
                <span className={i % 2 ? "text-outline" : "grad-text"}>{w}</span>
                <span className="mx-8 text-2xl text-accent">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  // start downloading the 3D scene with the HTML, before any JavaScript runs
  preload("/models/hero.glb", { as: "fetch", crossOrigin: "anonymous" });
  preload("/draco/draco_wasm_wrapper.js", { as: "fetch", crossOrigin: "anonymous" });
  preload("/draco/draco_decoder.wasm", { as: "fetch", crossOrigin: "anonymous" });
  return (
    <>
      <ScrollFx />
      <Nav />

      <aside className="after-intro fixed top-1/2 left-6 z-40 hidden -translate-y-1/2 xl:block" aria-label="Social links">
        <Socials vertical />
      </aside>

      <main className="flex-1">
        {/* hero -> about -> dive into the laptop: the pinned 3D story */}
        <Experience />

        {/* ---------- work: we are inside the laptop now ----------
            Pulled up one screen so it starts exactly under the story's last frame (the static copy of the laptop
            screen); when it reaches the top it switches to this live copy: a small working browser. */}
        <section id="work" className="work-in-laptop relative h-svh">
          <LaptopBrowser live className="laptop-live absolute inset-0" />
        </section>
        <div aria-hidden className="h-40 bg-gradient-to-b from-screen to-background" />

        <Marquee words={["Software Developer", "Web Developer", "Web Designer", "Content Writer"]} />

        {/* ---------- services (the character works on the left) ---------- */}
        <section id="services" className="mx-auto flex min-h-svh max-w-7xl scroll-mt-16 items-center px-5 py-28 sm:px-10">
          <div className="w-full lg:ml-auto lg:w-[54%]">
            <div data-reveal><Eyebrow n="03">Skills &amp; services</Eyebrow></div>
            <h2 data-split className="mt-5 text-4xl font-bold sm:text-6xl">What I do</h2>
            <p data-reveal className="mt-5 max-w-xl text-muted">I stay ahead with the latest technologies to provide innovative solutions.</p>
            <div data-stagger className="mt-12 grid gap-4">
              {services.map((s, i) => (
                <div key={s.title}>
                  <article className="glass glow-border group flex gap-6 rounded-3xl p-7 transition duration-500 hover:bg-white/[0.05]">
                    <p className="font-display text-3xl font-extrabold text-white/15 transition group-hover:text-accent">{String(i + 1).padStart(2, "0")}</p>
                    <div>
                      <h3 className="text-lg font-semibold sm:text-xl">{s.title}</h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-muted">{s.body}</p>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- resume (the character reads it from the right) ---------- */}
        <section id="resume" className="mx-auto flex min-h-svh max-w-7xl scroll-mt-16 items-center px-5 py-28 sm:px-10">
          <div className="w-full lg:w-[54%]">
            <div data-reveal><Eyebrow n="04">Education &amp; experience</Eyebrow></div>
            <h2 data-split className="mt-5 text-4xl font-bold sm:text-6xl">Learning &amp; professional growth</h2>
            <p data-reveal className="mt-5 max-w-xl text-muted">I believe in continuous learning and hands-on experience to keep up with an ever-evolving industry.</p>
            <div data-stagger className="mt-12 grid gap-6 md:grid-cols-2">
              {[{ heading: "Education", items: education }, { heading: "Experience", items: experience }].map((col) => (
                <div key={col.heading}>
                  <div className="glass rounded-3xl p-7">
                    <h3 className="mb-7 flex items-center gap-3 text-xl font-semibold">
                      <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" />
                      {col.heading}
                    </h3>
                    <ol className="space-y-8 border-l border-white/10 pl-6">
                      {col.items.map((it) => (
                        <li key={it.title} className="relative">
                          <span className="absolute top-1.5 -left-[29px] h-2.5 w-2.5 rounded-full border-2 border-accent bg-background" />
                          <p className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[11px] text-accent">{it.period}</p>
                          <h4 className="mt-2.5 text-lg font-semibold">{it.title}</h4>
                          <p className="mt-2 text-sm leading-relaxed text-muted">{it.body}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- contact (the character waves from the right) ---------- */}
        <section id="contact" className="mx-auto flex min-h-svh max-w-7xl scroll-mt-16 items-center px-5 pt-16 pb-28 sm:px-10">
          <div className="w-full lg:w-[54%]">
            <div data-reveal className="glass glow-border relative overflow-hidden rounded-[2rem] p-7 sm:p-12">
              <div aria-hidden className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
              <div aria-hidden className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-accent-3/10 blur-3xl" />
              <Eyebrow n="05">Get in touch</Eyebrow>
              <h2 data-split className="mt-5 text-4xl font-bold sm:text-5xl">Let&apos;s build something <span className="grad-text">great</span></h2>
              <p className="mt-4 max-w-xl text-muted">Have a project or role in mind? My inbox is always open.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <a href={`mailto:${profile.email}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 p-4 transition hover:border-accent/50">
                  <MailIcon className="h-5 w-5 shrink-0 text-accent" />
                  <span className="truncate text-sm">{profile.email}</span>
                </a>
                <a href={profile.phoneHref} className="flex items-center gap-3 rounded-2xl border border-white/10 p-4 transition hover:border-accent/50">
                  <PhoneIcon className="h-5 w-5 shrink-0 text-accent" />
                  <span className="text-sm">{profile.phone}</span>
                </a>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 p-4">
                  <PinIcon className="h-5 w-5 shrink-0 text-accent" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              </div>
              <div className="mt-8">
                <ContactForm email={profile.email} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative overflow-hidden border-t border-white/8">
        <p aria-hidden className="pointer-events-none select-none text-center font-display text-[18vw] leading-[0.8] font-extrabold tracking-tighter text-white/[0.03] uppercase">Johan</p>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 font-mono text-xs text-white/50 sm:flex-row sm:px-10">
          <p>© {profile.name}</p>
          <Socials />
          <a href="#home" className="transition hover:text-accent">Back to top ↑</a>
        </div>
      </footer>
    </>
  );
}
