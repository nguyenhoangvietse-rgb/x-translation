import Link from "next/link";
import { ArrowRight, Sparkles, Upload, Feather } from "lucide-react";
import { HomeStats } from "@/components/HomeStats";

export default function Home() {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* decorative grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      {/* gold orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-130 w-130 rounded-full blur-3xl opacity-30"
        style={{ background: "var(--gradient-gold)" }}
      />

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <Feather className="h-5 w-5 text-accent" />
          <span className="font-display text-xl">X·Translation</span>
        </Link>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a
            href="#library"
            className="hover:text-foreground transition-colors"
          >
            Library
          </a>
          <a
            href="#workflow"
            className="hover:text-foreground transition-colors"
          >
            Workflow
          </a>
          <a href="#about" className="hover:text-foreground transition-colors">
            About
          </a>
        </nav>
        <button className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-accent transition-colors">
          Sign in
        </button>
      </header>

      {/* hero */}
      <main className="relative z-10 mx-auto max-w-7xl px-6">
        <section className="pt-20 pb-32 text-center">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-4 py-1.5 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              A quiet home for translated stories
            </span>
          </div>

          <h1 className="font-display text-6xl leading-[0.95] text-foreground md:text-8xl">
            Where novels
            <br />
            <span
              className="italic"
              style={{
                background: "var(--gradient-gold)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              cross languages
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground">
            Manage, translate and publish novels in one calm workspace. Built
            for translators who care about every sentence.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/novels"
              className="group inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-medium text-primary-foreground transition-all hover:scale-[1.02]"
              style={{
                background: "var(--gradient-gold)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              Browse novels
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/30 px-8 py-4 text-sm font-medium text-foreground backdrop-blur hover:bg-card/60 hover:border-accent transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload content
            </Link>
          </div>

          {/* stats */}
          <HomeStats />
        </section>

        <footer className="relative z-10 border-t border-border py-8 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          © {new Date().getFullYear()} X·Translation — Crafted for storytellers
        </footer>
      </main>
    </div>
  );
}
