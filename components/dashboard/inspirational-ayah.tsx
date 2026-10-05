"use client";
import React from "react";
import { useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { inspirationalAyahs } from "@/lib/constants/ayahs";
import { useSettings } from "@/providers/settings-provider";
import { cn } from "@/lib/utils";

export function InspirationalAyah({ className }: { className?: string }) {
  const { settings } = useSettings();
  const reduced = useReducedMotion() || settings.appearance.reducedMotion;
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [onScreen, setOnScreen] = React.useState(true);
  const [phase, setPhase] = React.useState("in");
  const root = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const visibility = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", visibility);
    visibility();
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? false), {
            threshold: 0.25,
          });
    if (root.current) observer?.observe(root.current);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      observer?.disconnect();
    };
  }, []);
  React.useEffect(() => {
    if (paused || reduced || !visible || !onScreen) {
      setPhase("in");
      return;
    }
    let fade: ReturnType<typeof setTimeout>;
    const dwell = setTimeout(() => {
      setPhase("out");
      fade = setTimeout(() => {
        setIndex((i) => (i + 1) % inspirationalAyahs.length);
        setPhase("in");
      }, 400);
    }, 8000);
    return () => {
      clearTimeout(dwell);
      clearTimeout(fade);
    };
  }, [index, paused, reduced, visible, onScreen]);
  return (
    <figure
      ref={root}
      aria-label="A reminder from the Quran"
      className={cn("folio-section text-center", className)}
    >
      {/* All verses occupy the same grid cell, reserving the tallest one's height at every width. Hidden verses are absent from the accessibility tree. */}
      <div className="ayah-stack mx-auto max-w-[600px]">
        {inspirationalAyahs.map((ayah, i) => (
          <div
            key={ayah.id}
            aria-hidden={i !== index}
            className="py-3"
            style={{
              visibility: i === index ? "visible" : "hidden",
              opacity: i === index && phase === "in" ? 1 : 0,
              transition: reduced ? "none" : `opacity ${phase === "out" ? 400 : 450}ms ease-in-out`,
            }}
          >
            <blockquote lang="ar" dir="rtl" className="text-[25px] leading-[2] md:text-[28px]">
              {ayah.arabic}
            </blockquote>
            <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-sm leading-relaxed">
              {ayah.translation}
            </p>
            <p className="text-muted-foreground mt-3 text-xs">
              {ayah.surah} · {ayah.reference}
            </p>
          </div>
        ))}
      </div>
      {!reduced && (
        <button
          type="button"
          aria-label={paused ? "Resume changing reminders" : "Pause changing reminders"}
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className="text-muted-foreground mx-auto flex min-h-11 items-center gap-2 px-3 text-xs"
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          <span>{paused ? "Reminders paused" : "A moment to reflect"}</span>
        </button>
      )}
    </figure>
  );
}
