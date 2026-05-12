"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function HomeStats() {
  const stats = useQuery(api.novels.getStats);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  const metadata = [
    {
      k: stats ? formatNumber(stats.novelCount) : "...",
      l: "Novels in library",
    },
    {
      k: stats ? formatNumber(stats.chapterCount) : "...",
      l: "Chapters translated",
    },
  ];

  return (
    <div className="mx-auto mt-24 grid max-w-3xl grid-cols-2 gap-8 border-t border-border pt-10">
      {metadata.map((s) => (
        <div key={s.l} className="text-center">
          <div className="font-display text-4xl text-foreground">{s.k}</div>
          <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
            {s.l}
          </div>
        </div>
      ))}
    </div>
  );
}
