"use client";

import * as React from "react";

interface AmbientMusicHandle {
  enabled: boolean;
  toggle: () => void;
  disable: () => void;
}

interface AudioNodes {
  ctx: AudioContext;
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  masterGain: GainNode;
  filter: BiquadFilterNode;
}

/**
 * Synthesizes a soft ambient pad with the Web Audio API — two slowly detuned
 * sine oscillators (a major third apart) routed through a lowpass filter and
 * a slow tremolo LFO, into a master gain with a gentle attack/release envelope.
 *
 * No audio asset is needed. Volume is intentionally very low (~0.05) so the
 * pad reads as background atmosphere rather than music. Autoplay is NEVER
 * triggered — the user must toggle the control to start the AudioContext.
 *
 * The hook cleans up its AudioContext on unmount.
 */
export function useAmbientMusic(): AmbientMusicHandle {
  const [enabled, setEnabled] = React.useState(false);
  const nodesRef = React.useRef<AudioNodes | null>(null);

  const stop = React.useCallback(() => {
    const nodes = nodesRef.current;
    if (!nodes) return;
    const { ctx, masterGain, osc1, osc2, lfo } = nodes;
    try {
      // gentle release to avoid click
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    } catch {
      /* noop */
    }
    // give the release ~0.8s, then tear down
    window.setTimeout(() => {
      try {
        osc1.stop();
      } catch {
        /* noop */
      }
      try {
        osc2.stop();
      } catch {
        /* noop */
      }
      try {
        lfo.stop();
      } catch {
        /* noop */
      }
      try {
        ctx.close();
      } catch {
        /* noop */
      }
    }, 900);
    nodesRef.current = null;
  }, []);

  const start = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const Ctor =
      window.AudioContext ||
      // @ts-expect-error legacy webkit prefix
      (window.webkitAudioContext as typeof AudioContext | undefined);
    if (!Ctor) return;
    const ctx = new Ctor();
    void ctx.resume?.();

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.gain.setTargetAtTime(0.05, ctx.currentTime, 1.4); // slow attack

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 620;
    filter.Q.value = 0.4;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 196; // G3
    osc1.detune.value = -4;

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 246.94; // B3 (major third) — soft, ambient
    osc2.detune.value = 6;

    // slow tremolo to give a "breathing" feel
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.08; // very slow
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.018;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);

    osc1.start();
    osc2.start();
    lfo.start();

    nodesRef.current = {
      ctx,
      osc1,
      osc2,
      lfo,
      lfoGain,
      masterGain,
      filter,
    };
  }, []);

  const toggle = React.useCallback(() => {
    setEnabled((prev) => {
      if (prev) {
        stop();
        return false;
      }
      start();
      return true;
    });
  }, [start, stop]);

  const disable = React.useCallback(() => {
    setEnabled(false);
    stop();
  }, [stop]);

  // Cleanup on unmount.
  React.useEffect(() => {
    return () => stop();
  }, [stop]);

  return { enabled, toggle, disable };
}
