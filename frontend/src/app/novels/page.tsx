"use client";

import { CreateNovelForm, NovelList } from "@/features/novels";
import Link from "next/link";
import { Feather, BookOpen, ArrowLeft, BookPlus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";

export default function NovelsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-50 w-50 rounded-full blur-3xl opacity-30"
        style={{ background: "var(--gradient-gold)" }}
      />

      {/* nav */}
      <header className="relative z-10 mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <Feather className="h-5 w-5 text-accent" />
          <span className="font-display text-xl">X·Translation</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="uppercase tracking-widest">Back home</span>
        </Link>
      </header>

      {/* main content */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-12">
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              The Library
            </span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-6xl text-foreground mb-4">
                Novels
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Curate the originals, then guide them gently into another
                language.
              </p>
            </div>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="px-6 py-3.5 rounded-lg font-medium text-primary-foreground transition-all hover:scale-[1.02] flex items-center gap-2"
              style={{
                background: "var(--gradient-gold)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <BookPlus className="h-5 w-5" />
              Add Novel
            </button>
          </div>
        </div>

        <NovelList />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <CreateNovelForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
