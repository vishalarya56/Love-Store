"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Sparkles,
  Image as ImageIcon,
  Music,
  Share2,
  ShieldCheck,
  Smartphone,
  IndianRupee,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "@/hooks/use-hash-route";
import { useAuth, useRequireAuth } from "@/stores/auth-store";
import { apiSeed } from "@/lib/client";

// Tiny floating hearts for the hero — capped for mobile.
function FloatingHearts() {
  const reduce = useReducedMotion();
  const hearts = Array.from({ length: 14 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {hearts.map((_, i) => {
        const left = (i * 7.3 + 5) % 100;
        const delay = (i * 1.37) % 8;
        const dur = 7 + (i % 5);
        const size = 12 + (i % 3) * 6;
        const op = 0.25 + (i % 4) * 0.12;
        return (
          <motion.span
            key={i}
            className="absolute select-none"
            style={{ left: `${left}%`, bottom: -20, opacity: 0 }}
            initial={{ y: 0, opacity: 0 }}
            animate={
              reduce
                ? { opacity: 0 }
                : {
                    y: [0, -700 - (i % 3) * 120],
                    x: [0, (i % 2 === 0 ? 30 : -30)],
                    opacity: [0, op, op, 0],
                  }
            }
            transition={{
              duration: dur,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Heart
              className="text-[#FF4F81]"
              style={{ width: size, height: size, filter: "drop-shadow(0 2px 4px rgba(255,79,129,0.3))" }}
              fill="currentColor"
            />
          </motion.span>
        );
      })}
    </div>
  );
}

function SparkleField() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const sparkles = Array.from({ length: 12 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {sparkles.map((_, i) => {
        const top = (i * 13 + 4) % 100;
        const left = (i * 9.7 + 3) % 100;
        const delay = (i * 0.8) % 4;
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{ top: `${top}%`, left: `${left}%` }}
            animate={{ opacity: [0.15, 1, 0.15], scale: [0.7, 1.1, 0.7] }}
            transition={{ duration: 2.4, delay, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-3 h-3 text-[#FFC7D8]" />
          </motion.span>
        );
      })}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loaded, refresh, openAuth } = useAuth();
  const requireAuth = useRequireAuth();
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleCreate() {
    if (requireAuth("create")) navigate("/create");
  }
  function handleDashboard() {
    if (requireAuth("dashboard")) navigate("/dashboard");
  }

  async function handleViewDemo() {
    setSeeding(true);
    const r = await apiSeed();
    setSeeding(false);
    if (r.success) {
      navigate(`/love/${r.data.slug}`);
    } else {
      // Images may still be generating — retry hint
      import("@/hooks/use-toast").then(({ toast }) =>
        toast({
          title: "Demo is warming up",
          description: r.error.message,
        })
      );
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col love-viewport"
      style={{ background: "var(--love-grad-bg)" }}
    >
      {/* Sticky top nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/40 border-b border-pink-200/40">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full love-btn flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-heading text-lg font-bold text-[#3B1725]">LoveStory</span>
          </div>
          <div className="flex items-center gap-2">
            {loaded && user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDashboard}
                  className="text-[#3B1725] hover:bg-pink-100/60 rounded-full"
                >
                  My Stories
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  className="love-btn border-0 rounded-full text-white"
                >
                  Create
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openAuth("generic")}
                  className="text-[#3B1725] hover:bg-pink-100/60 rounded-full"
                >
                  Sign in
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  className="love-btn border-0 rounded-full text-white"
                >
                  Start
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-5 py-16 overflow-hidden">
        {/* soft glows */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="love-glow absolute left-[-10%] top-[10%] w-72 h-72 rounded-full love-glow-pulse" />
          <div
            className="love-glow absolute right-[-10%] bottom-[5%] w-80 h-80 rounded-full love-glow-pulse"
            style={{ animationDelay: "1.2s" }}
          />
        </div>
        <FloatingHearts />
        <SparkleField />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto mb-6 w-24 h-24 rounded-full flex items-center justify-center relative"
          >
            <div className="absolute inset-0 rounded-full love-glow love-glow-pulse" />
            <motion.div
              className="love-heartbeat relative w-16 h-16 rounded-full love-btn flex items-center justify-center shadow-2xl"
              animate={{ boxShadow: ["0 0 30px rgba(255,79,129,0.5)", "0 0 50px rgba(255,79,129,0.8)", "0 0 30px rgba(255,79,129,0.5)"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Heart className="w-8 h-8 text-white" fill="white" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="love-hero-title font-heading font-bold text-[#3B1725] mb-3"
          >
            A tiny magical world
            <br />
            created for <span className="love-text-gradient">one person</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="love-body text-[#8B6472] mb-8 max-w-md mx-auto"
          >
            LoveStory turns your words, photos and feelings into a cinematic,
            mobile-first digital love letter someone can open on their phone and
            feel truly special.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 items-center justify-center"
          >
            <Button
              onClick={handleCreate}
              className="love-btn border-0 rounded-full h-12 px-7 text-white font-semibold text-base shadow-xl hover:scale-[1.02] transition-transform"
            >
              <Heart className="w-4 h-4" fill="white" /> Create a Love Story
            </Button>
            <Button
              onClick={handleViewDemo}
              disabled={seeding}
              variant="outline"
              className="bg-white/70 border-pink-200/60 text-[#3B1725] rounded-full h-12 px-7 font-semibold hover:bg-white"
            >
              {seeding ? "Preparing…" : "View a demo"}
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-6 text-sm text-[#8B6472] flex items-center justify-center gap-1.5 flex-wrap"
          >
            <IndianRupee className="w-4 h-4" />
            <span className="font-semibold text-[#3B1725]">₹9</span> for{" "}
            <span className="font-semibold text-[#3B1725]">2 love websites</span>
            <span className="mx-1">·</span>
            <span>No app, just a link</span>
          </motion.p>
        </div>
      </section>

      {/* Feature band */}
      <section className="px-5 py-14 bg-white/40 backdrop-blur-sm border-y border-pink-200/40">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.5 }}
            className="love-section-title font-heading text-center text-[#3B1725] mb-2"
          >
            Every love story deserves its own little world.
          </motion.h2>
          <p className="text-center text-[#8B6472] mb-10 max-w-xl mx-auto">
            Five simple steps. Two credits. One unforgettable link.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Heart,
                title: "Cinematic & emotional",
                desc: "Glowing hearts, soft particles, line-by-line story reveal — designed for the first 3 seconds of wow.",
              },
              {
                icon: Smartphone,
                title: "Mobile-first by design",
                desc: "Made for WhatsApp, Instagram, Messenger. Looks gorgeous on the smallest phone.",
              },
              {
                icon: ImageIcon,
                title: "Swipeable memories",
                desc: "Your 2–4 photos become a cinematic album with captions and smooth snap gestures.",
              },
              {
                icon: Music,
                title: "Emotion themes & music",
                desc: "10 emotions each shape the colors and particles. Optional gentle ambient music.",
              },
              {
                icon: ShieldCheck,
                title: "Private & safe",
                desc: "Your phone is never shared. Drafts stay private. Only published links are public.",
              },
              {
                icon: Share2,
                title: "One shareable link",
                desc: "Each love story gets a unique link like #/love/a8F92kLm — theirs to keep.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="love-glass rounded-3xl p-5"
              >
                <div className="w-10 h-10 rounded-xl love-btn flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-heading text-lg text-[#3B1725] mb-1">{f.title}</h3>
                <p className="text-sm text-[#8B6472] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 py-14">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-15%" }}
            transition={{ duration: 0.5 }}
            className="love-section-title font-heading text-center text-[#3B1725] mb-10"
          >
            Five steps. One love letter.
          </motion.h2>
          <ol className="grid sm:grid-cols-5 gap-3">
            {[
              { e: "💕", t: "Start" },
              { e: "❤️", t: "Emotion" },
              { e: "💌", t: "Story" },
              { e: "📸", t: "Memories" },
              { e: "✨", t: "Preview" },
            ].map((s, i) => (
              <motion.li
                key={s.t}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="love-glass rounded-2xl p-4 text-center"
              >
                <div className="text-3xl mb-2">{s.e}</div>
                <div className="text-xs text-[#8B6472] mb-1">Step {i + 1}</div>
                <div className="font-heading text-base text-[#3B1725]">{s.t}</div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl love-glass-strong rounded-[32px] p-8 sm:p-12 text-center relative overflow-hidden"
        >
          <div className="love-glow absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 love-glow-pulse" aria-hidden />
          <div className="relative z-10">
            <Heart className="w-10 h-10 mx-auto text-[#FF4F81] mb-3 love-heartbeat" fill="currentColor" />
            <h2 className="love-section-title font-heading text-[#3B1725] mb-2">
              Ready to make someone feel special?
            </h2>
            <p className="text-[#8B6472] mb-6 max-w-md mx-auto">
              Pay ₹9 once. Get 2 love websites. Create something they'll open
              again and again.
            </p>
            <Button
              onClick={handleCreate}
              className="love-btn border-0 rounded-full h-12 px-8 text-white font-semibold text-base shadow-xl hover:scale-[1.02] transition-transform"
            >
              Create my Love Story
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer (sticky to bottom) */}
      <footer className="mt-auto bg-white/50 border-t border-pink-200/40 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8B6472]">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-[#FF4F81]" fill="currentColor" />
            <span>Made with love · LoveStory</span>
          </div>
          <div className="flex items-center gap-4">
            <span>₹9 · 2 credits</span>
            <span>Mobile-first</span>
            <span>Private by default</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
