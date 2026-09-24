import type { Emotion } from "@/lib/validation";

export interface EmotionConfig {
  id: Emotion;
  label: string;
  emoji: string;
  tagline: string;
  // Tailwind-ish gradient classes for the recipient theme
  theme: {
    bgGradient: string; // CSS gradient for the experience background
    accent: string; // hex accent
    accentSoft: string; // soft accent for glows
    particle: "heart" | "sparkle" | "star" | "petal" | "confetti";
    finalGradient: string; // final section background
  };
}

export const EMOTIONS: EmotionConfig[] = [
  {
    id: "love",
    label: "Love",
    emoji: "❤️",
    tagline: "A warm, romantic glow just for them.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #FFF5F8 0%, #FFD6E5 50%, #FFB5CB 100%)",
      accent: "#FF4F81",
      accentSoft: "rgba(255,127,158,0.45)",
      particle: "heart",
      finalGradient:
        "linear-gradient(135deg, #2B0B18 0%, #4A1028 50%, #24102F 100%)",
    },
  },
  {
    id: "anniversary",
    label: "Anniversary",
    emoji: "💍",
    tagline: "Elegant sparkles to celebrate your journey.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #FFF8FB 0%, #FFE0EC 45%, #F4D8FF 100%)",
      accent: "#C084FC",
      accentSoft: "rgba(192,132,252,0.4)",
      particle: "sparkle",
      finalGradient:
        "linear-gradient(135deg, #2A1240 0%, #4B1F6B 50%, #1A0B2B 100%)",
    },
  },
  {
    id: "proposal",
    label: "Proposal",
    emoji: "💌",
    tagline: "A dreamy, magical moment of forever.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #FFF5FB 0%, #FFCEE6 50%, #E9C8FF 100%)",
      accent: "#E879B8",
      accentSoft: "rgba(232,121,184,0.45)",
      particle: "heart",
      finalGradient:
        "linear-gradient(135deg, #2C0B1F 0%, #50134D 50%, #1B0A2B 100%)",
    },
  },
  {
    id: "birthday",
    label: "Birthday",
    emoji: "🎂",
    tagline: "Romantic celebration with subtle confetti.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #FFF7F0 0%, #FFD9E0 45%, #FFE9B4 100%)",
      accent: "#FF6F91",
      accentSoft: "rgba(255,159,177,0.45)",
      particle: "confetti",
      finalGradient:
        "linear-gradient(135deg, #2B0B18 0%, #4A1028 50%, #24102F 100%)",
    },
  },
  {
    id: "wedding",
    label: "Wedding",
    emoji: "💒",
    tagline: "Elegant white, pink and purple styling.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #FFFFFF 0%, #FFE9F2 45%, #F0E0FF 100%)",
      accent: "#A855F7",
      accentSoft: "rgba(168,85,247,0.35)",
      particle: "sparkle",
      finalGradient:
        "linear-gradient(135deg, #1F0B2B 0%, #3B1248 50%, #160B24 100%)",
    },
  },
  {
    id: "long_distance",
    label: "Long Distance",
    emoji: "🌍",
    tagline: "Stars and moonlight across the distance.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #0F1B3D 0%, #1E2A5E 50%, #2C1B4D 100%)",
      accent: "#9DB4FF",
      accentSoft: "rgba(157,180,255,0.5)",
      particle: "star",
      finalGradient:
        "linear-gradient(135deg, #070B22 0%, #11183C 50%, #060A1C 100%)",
    },
  },
  {
    id: "missing_you",
    label: "Missing You",
    emoji: "💔",
    tagline: "Deep romantic night colors, slow drifting hearts.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #1A0B1F 0%, #3A0F2B 50%, #200B2E 100%)",
      accent: "#FF7FAA",
      accentSoft: "rgba(255,127,170,0.4)",
      particle: "heart",
      finalGradient:
        "linear-gradient(135deg, #150719 0%, #2C0B23 50%, #120617 100%)",
    },
  },
  {
    id: "appreciation",
    label: "Appreciation",
    emoji: "🫶",
    tagline: "A warm golden-pink feeling of gratitude.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #FFF7EC 0%, #FFE3C7 45%, #FFD0E0 100%)",
      accent: "#F59E0B",
      accentSoft: "rgba(245,158,11,0.4)",
      particle: "sparkle",
      finalGradient:
        "linear-gradient(135deg, #2A1A0B 0%, #4A2A12 50%, #241709 100%)",
    },
  },
  {
    id: "cute_sweet",
    label: "Cute & Sweet",
    emoji: "🌸",
    tagline: "Playful small hearts in soft pastels.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #FFF6FB 0%, #FFE3F2 45%, #FDE9FF 100%)",
      accent: "#FF80AB",
      accentSoft: "rgba(255,128,171,0.4)",
      particle: "petal",
      finalGradient:
        "linear-gradient(135deg, #2A0B1F 0%, #4A1240 50%, #1F0A24 100%)",
    },
  },
  {
    id: "just_because",
    label: "Just Because I Love You",
    emoji: "✨",
    tagline: "A minimal, intimate love-letter design.",
    theme: {
      bgGradient:
        "linear-gradient(135deg, #FFF5F8 0%, #FFE0EA 60%, #FFCFE0 100%)",
      accent: "#FF4F81",
      accentSoft: "rgba(255,127,158,0.4)",
      particle: "sparkle",
      finalGradient:
        "linear-gradient(135deg, #2B0B18 0%, #421027 50%, #24102F 100%)",
    },
  },
];

export const EMOTION_MAP: Record<Emotion, EmotionConfig> = EMOTIONS.reduce(
  (acc, e) => {
    acc[e.id] = e;
    return acc;
  },
  {} as Record<Emotion, EmotionConfig>
);

export function getEmotion(id: Emotion): EmotionConfig {
  return EMOTION_MAP[id] ?? EMOTIONS[0]!;
}
