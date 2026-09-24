"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReducedMotion } from "./ReducedMotionGate";
import type { PublicLoveImage } from "@/lib/client";

interface MemoryGalleryProps {
  images: PublicLoveImage[];
  accent: string;
}

/**
 * "Our Little Memories 📸" — a swipeable, snap-scrolling gallery of the
 * creator's 2–4 photos. Each slide:
 *   - reveals on scroll (opacity 0→1, scale 0.96→1, blur 8px→0)
 *   - has a caption below
 *   - opens a tap-to-expand zoom Dialog
 *   - is keyboard accessible (← / → move between slides)
 *
 * The gallery scrolls horizontally inside a fixed-height container so it
 * never triggers page-level horizontal scroll.
 */
export function MemoryGallery({ images, accent }: MemoryGalleryProps) {
  const { reduced } = useReducedMotion();
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const slideRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = React.useState(0);
  const [zoom, setZoom] = React.useState<number | null>(null);

  // Sort by sortOrder defensively (the payload is already sorted, but we
  // don't want to break if it ever isn't).
  const sorted = React.useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder),
    [images]
  );

  const onScroll = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const cell = el.clientWidth;
    if (cell <= 0) return;
    const idx = Math.round(el.scrollLeft / cell);
    setActive((prev) => (prev === idx ? prev : Math.max(0, Math.min(idx, sorted.length - 1))));
  }, [sorted.length]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Initialize active index on mount.
    const cell = el.clientWidth;
    if (cell > 0) {
      setActive(Math.round(el.scrollLeft / cell));
    }
  }, []);

  const scrollToIndex = React.useCallback((idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(idx, sorted.length - 1));
    el.scrollTo({
      left: clamped * el.clientWidth,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [sorted.length, reduced]);

  const handleSlideKey = (idx: number) => (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = Math.min(idx + 1, sorted.length - 1);
      scrollToIndex(next);
      slideRefs.current[next]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      scrollToIndex(prev);
      slideRefs.current[prev]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setZoom(idx);
    }
  };

  if (sorted.length === 0) return null;

  return (
    <section
      aria-labelledby="memories-heading"
      className="py-16 sm:py-20"
    >
      <div className="px-5">
        <motion.h2
          id="memories-heading"
          className="love-section-title font-heading text-center font-bold"
          style={{ color: "var(--love-text)" }}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: reduced ? 0.2 : 0.6, ease: "easeOut" }}
        >
          Our Little Memories 📸
        </motion.h2>
        <motion.div
          aria-hidden="true"
          className="mx-auto mt-3 h-[3px] w-24 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
          initial={{ opacity: 0, scaleX: 0.6 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: reduced ? 0.2 : 0.7, ease: "easeOut" }}
        />
      </div>

      {/* Snap scroller — fixed height, contained, no page-level horizontal scroll. */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="love-no-scrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth"
        style={{ scrollSnapType: "x mandatory", paddingLeft: "5vw", paddingRight: "5vw" }}
        aria-label="Memory gallery, swipe horizontally"
      >
        {sorted.map((img, i) => {
          const caption = img.caption ?? `Memory ${i + 1} of ${sorted.length}`;
          const isPriority = i === 0;
          return (
            <motion.div
              key={img.id}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={`Memory ${i + 1} of ${sorted.length}: ${caption}`}
              tabIndex={0}
              onKeyDown={handleSlideKey(i)}
              className="love-glass relative flex w-[86vw] shrink-0 snap-center items-stretch overflow-hidden rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-pink-300 sm:w-[480px]"
              style={{ touchAction: "pan-x" }}
              initial={{
                opacity: 0,
                scale: reduced ? 1 : 0.96,
                filter: reduced ? "none" : "blur(8px)",
              }}
              whileInView={{
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
              }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{
                duration: reduced ? 0.18 : 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <button
                type="button"
                onClick={() => setZoom(i)}
                aria-label={`Open memory ${i + 1}: ${caption}`}
                className="group block w-full cursor-zoom-in p-3 focus:outline-none"
              >
                <div
                  className="relative w-full overflow-hidden rounded-2xl"
                  style={{
                    aspectRatio: `${img.width} / ${img.height}`,
                    background: "rgba(255,255,255,0.4)",
                  }}
                >
                  <Image
                    src={img.url}
                    alt={caption}
                    width={img.width}
                    height={img.height}
                    sizes="(max-width: 768px) 90vw, 600px"
                    loading={isPriority ? "eager" : "lazy"}
                    priority={isPriority}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                  {/* soft light overlay */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.18) 100%)",
                    }}
                  />
                </div>
                <p
                  className="love-body mt-3 px-1 text-center"
                  style={{ color: "var(--love-text)" }}
                >
                  {img.caption ?? caption}
                </p>
              </button>
            </motion.div>
          );
        })}
        {/* trailing spacer so last slide can snap-center fully */}
        <div aria-hidden="true" className="shrink-0" style={{ width: "5vw" }} />
      </div>

      {/* pagination dots */}
      <div
        className="mt-5 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Memory gallery position"
      >
        {sorted.map((img, i) => {
          const isActive = i === active;
          return (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Go to memory ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className="flex h-11 w-11 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 rounded-full"
            >
              <span
                className="block rounded-full transition-all duration-300"
                style={{
                  width: isActive ? 10 : 8,
                  height: isActive ? 10 : 8,
                  background: isActive ? accent : "rgba(155,80,110,0.30)",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Zoom dialog */}
      <Dialog open={zoom !== null} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent
          showCloseButton
          className="max-w-[95vw] border-0 bg-black/80 p-2 sm:max-w-3xl"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {zoom !== null ? sorted[zoom]?.caption ?? `Memory ${(zoom ?? 0) + 1}` : "Memory"}
          </DialogTitle>
          {zoom !== null && (
            <div className="flex flex-col items-center">
              <div
                className="relative w-full"
                style={{
                  aspectRatio: `${sorted[zoom]!.width} / ${sorted[zoom]!.height}`,
                  maxHeight: "78vh",
                }}
              >
                <Image
                  src={sorted[zoom]!.url}
                  alt={sorted[zoom]!.caption ?? `Memory ${zoom + 1}`}
                  fill
                  sizes="(max-width: 768px) 95vw, 768px"
                  className="h-full w-full rounded-xl object-contain"
                />
              </div>
              {sorted[zoom]!.caption && (
                <p className="mt-2 px-4 text-center text-sm text-white/85">
                  {sorted[zoom]!.caption}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
