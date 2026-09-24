"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  Loader2,
  Upload,
  X,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  IndianRupee,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { useNavigate } from "@/hooks/use-hash-route";
import { useAuth } from "@/stores/auth-store";
import {
  apiGuestSession,
  apiCreateDraft,
  apiGetDraft,
  apiPatchDraft,
  apiUploadImage,
  apiPatchImage,
  apiDeleteImage,
  apiGetCredits,
  apiCreateOrder,
  apiVerifyPayment,
  apiGenerate,
  type DraftDTO,
  isApiError,
} from "@/lib/client";
import { EMOTIONS } from "@/lib/emotions";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  { key: "start", emoji: "💕", title: "Start" },
  { key: "emotion", emoji: "❤️", title: "Emotion" },
  { key: "story", emoji: "💌", title: "Story" },
  { key: "memories", emoji: "📸", title: "Memories" },
  { key: "preview", emoji: "✨", title: "Preview" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const STEP_TITLES: Record<StepKey, string> = {
  start: "Let's begin 💕",
  emotion: "How does it feel? ❤️",
  story: "Your love letter 💌",
  memories: "Your memories 📸",
  preview: "Almost there ✨",
};

export default function CreatorFlow({ draftId }: { draftId?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState<DraftDTO | null>(null);
  const [step, setStep] = useState<StepKey>("start");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [credits, setCredits] = useState<{ total: number; used: number; remaining: number } | null>(null);

  // local form state mirrors draft fields for snappy typing
  const [form, setForm] = useState({
    creatorName: "",
    phone: user?.phone ?? "",
    intro: "",
    emotion: "" as string,
    partnerName: "",
    relationship: "",
    story: "",
    specialMessage: "",
    finalMessage: "",
    signature: "",
    shareConsent: false,
    musicEnabled: false,
  });

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // stable helper to merge a draft into local form state
  const applyDraft = useCallback((d: DraftDTO) => {
    setForm((f) => ({
      ...f,
      creatorName: d.creatorName ?? f.creatorName,
      phone: d.phone ?? f.phone,
      intro: d.intro ?? "",
      emotion: d.emotion ?? "",
      partnerName: d.partnerName ?? "",
      relationship: d.relationship ?? "",
      story: d.story ?? "",
      specialMessage: d.specialMessage ?? "",
      finalMessage: d.finalMessage ?? "",
      signature: d.signature ?? "",
      shareConsent: d.shareConsent,
      musicEnabled: d.musicEnabled,
    }));
  }, []);

  // ---- init: load existing draft or create one ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (draftId) {
        const r = await apiGetDraft(draftId);
        if (cancelled) return;
        if (r.success) {
          setDraft(r.data);
          applyDraft(r.data);
        } else {
          toast({ title: "Couldn't load draft", description: r.error.message });
        }
      } else {
        // Login-free mode: make sure a guest session exists immediately before
        // creating the draft. This also recovers gracefully if the initial
        // session bootstrap was lost/blocked by the browser or deployment.
        let r = await apiCreateDraft();
        if (!r.success && r.error.code === "AUTH_REQUIRED") {
          const guest = await apiGuestSession();
          if (guest.success) r = await apiCreateDraft();
          else {
            toast({ title: "Couldn't start guest session", description: guest.error.message });
          }
        }
        if (cancelled) return;
        if (r.success) {
          setDraft(r.data);
          applyDraft(r.data);
          // reflect draft id in URL without nav reload
          window.history.replaceState(null, "", `#/create/${r.data.id}`);
        } else {
          toast({ title: "Couldn't start draft", description: r.error.message });
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [draftId, applyDraft]);

  // ---- credits refresh ----
  const refreshCredits = useCallback(async () => {
    const r = await apiGetCredits();
    if (r.success) setCredits(r.data);
    return r;
  }, []);
  useEffect(() => {
    void (async () => {
      await refreshCredits();
    })();
  }, [refreshCredits]);

  // ---- autosave (debounced 700ms) + localStorage backup ----
  // Driven by `form` changes + the draft id. Using the id string (not the
  // whole `draft` object) means syncing image upload responses back into
  // `draft` won't retrigger a no-op autosave loop.
  const currentDraftId = draft?.id;
  useEffect(() => {
    if (!currentDraftId) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setSaving(true);
      const r = await apiPatchDraft(currentDraftId, form);
      setSaving(false);
      if (r.success) {
        // We intentionally do NOT setDraft(r.data) here — the local `form` is
        // the source of truth for content, and recreating the `draft` object
        // would retrigger this effect in a no-op autosave loop. The server
        // re-validates readiness at generation time.
        try {
          localStorage.setItem("ls_draft_backup", JSON.stringify({ id: currentDraftId, form, ts: Date.now() }));
        } catch {}
      }
    }, 700);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [form, currentDraftId]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function next() {
    const i = STEPS.findIndex((s) => s.key === step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]!.key);
  }
  function back() {
    const i = STEPS.findIndex((s) => s.key === step);
    if (i > 0) setStep(STEPS[i - 1]!.key);
  }

  // ---- step validation (lightweight; server enforces real rules) ----
  function canProceed(): boolean {
    switch (step) {
      case "start":
        return form.creatorName.trim().length >= 2;
      case "emotion":
        return !!form.emotion && form.partnerName.trim().length >= 2;
      case "story":
        return form.story.trim().length >= 20 && form.specialMessage.trim().length >= 5 && form.shareConsent;
      case "memories":
        return (draft?.images ?? []).filter((i) => i.state === "READY").length >= 2;
      case "preview":
        return true;
    }
  }

  async function handleUpload(file: File) {
    if (!draft) return;
    const r = await apiUploadImage(draft.id, file);
    if (r.success) {
      setDraft(r.data);
      toast({ title: "Photo added 💕" });
    } else {
      toast({ title: "Upload failed", description: r.error.message, variant: "destructive" });
    }
  }
  async function handleCaption(imageId: string, caption: string) {
    const r = await apiPatchImage(imageId, { caption });
    if (r.success && "images" in r.data) setDraft(r.data);
  }
  async function handleDeleteImage(imageId: string) {
    const r = await apiDeleteImage(imageId);
    if (r.success && "images" in r.data) setDraft(r.data);
    toast({ title: "Photo removed" });
  }

  // ---- payment (fake provider) ----
  const [paying, setPaying] = useState(false);
  async function handleBuyCredits() {
    setPaying(true);
    const order = await apiCreateOrder();
    if (isApiError(order)) {
      setPaying(false);
      toast({ title: "Payment failed", description: order.error.message, variant: "destructive" });
      return;
    }
    // Simulate a Razorpay-like checkout. For the fake provider we already have
    // the payment id + signature returned by the server.
    await new Promise((res) => setTimeout(res, 900));
    const verify = await apiVerifyPayment({
      providerOrderId: order.data.providerOrderId,
      providerPaymentId: order.data.fakePaymentId!,
      signature: order.data.fakeSignature,
    });
    setPaying(false);
    if (isApiError(verify)) {
      toast({ title: "Verification failed", description: verify.error.message, variant: "destructive" });
      return;
    }
    setCredits({ total: verify.data.total, used: verify.data.used, remaining: verify.data.remaining });
    toast({ title: `+${verify.data.creditsGranted} credits added 💕`, description: "You're ready to publish." });
  }

  // ---- generation ----
  async function handlePublish() {
    if (!draft) return;
    setPublishing(true);
    const r = await apiGenerate(draft.id);
    setPublishing(false);
    if (isApiError(r)) {
      if (r.error.code === "CREDIT_INSUFFICIENT") {
        toast({ title: "Out of credits", description: r.error.message });
      } else {
        toast({ title: "Couldn't publish", description: r.error.message, variant: "destructive" });
      }
      return;
    }
    await refreshCredits();
    toast({ title: "Your love story is live ✨", description: "Sharing the link with you…" });
    navigate(`/love/${r.data.website.slug}`);
  }

  if (loading || !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--love-grad-bg)" }}>
        <Heart className="w-8 h-8 text-[#FF4F81] love-heartbeat" fill="currentColor" />
      </div>
    );
  }

  const readyImages = draft.images.filter((i) => i.state === "READY");
  const hasCredit = (credits?.remaining ?? 0) > 0;

  return (
    <div className="min-h-screen flex flex-col love-viewport" style={{ background: "var(--love-grad-bg)" }}>
      {/* header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/50 border-b border-pink-200/40">
        <div className="mx-auto max-w-3xl px-5 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[#3B1725] font-heading font-bold"
          >
            <div className="w-7 h-7 rounded-full love-btn flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="white" />
            </div>
            LoveStory
          </button>
          <div className="flex items-center gap-2 text-xs">
            {saving ? (
              <span className="flex items-center gap-1 text-[#8B6472]">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#8B6472]">
                <CheckCircle2 className="w-3 h-3 text-green-600" /> Saved
              </span>
            )}
            {credits && (
              <span className="px-2 py-0.5 rounded-full bg-pink-100 text-[#E93669] font-semibold">
                {credits.remaining} credit{credits.remaining === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        {/* step progress bar */}
        <div className="px-5 pb-2">
          <Progress value={((stepIndex + 1) / STEPS.length) * 100} className="h-1.5 bg-pink-100" />
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#8B6472]">
            <span>Step {stepIndex + 1} of {STEPS.length}</span>
            <span className="hidden sm:flex items-center gap-1">
              {STEPS.map((s, i) => (
                <span key={s.key} className="flex items-center gap-1">
                  <span className={i === stepIndex ? "text-[#E93669] font-semibold" : ""}>{s.emoji} {s.title}</span>
                  {i < STEPS.length - 1 && <span className="opacity-40">→</span>}
                </span>
              ))}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="love-section-title font-heading text-[#3B1725] mb-6">
                {STEP_TITLES[step]}
              </h1>

              {step === "start" && (
                <StepStart form={form} set={set} />
              )}
              {step === "emotion" && (
                <StepEmotion form={form} set={set} />
              )}
              {step === "story" && (
                <StepStory form={form} set={set} />
              )}
              {step === "memories" && (
                <StepMemories
                  draft={draft}
                  onUpload={handleUpload}
                  onCaption={handleCaption}
                  onDelete={handleDeleteImage}
                />
              )}
              {step === "preview" && (
                <StepPreview
                  form={form}
                  draft={draft}
                  hasCredit={hasCredit}
                  paying={paying}
                  publishing={publishing}
                  onBuy={handleBuyCredits}
                  onPublish={handlePublish}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* footer nav */}
      <footer className="mt-auto sticky bottom-0 z-20 backdrop-blur-md bg-white/70 border-t border-pink-200/40">
        <div className="mx-auto max-w-2xl px-5 h-16 flex items-center justify-between gap-3">
          {stepIndex > 0 ? (
            <Button variant="ghost" onClick={back} className="rounded-full text-[#3B1725]">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          {step !== "preview" ? (
            <Button
              onClick={next}
              disabled={!canProceed()}
              className="love-btn border-0 rounded-full h-11 px-6 text-white font-semibold disabled:opacity-40"
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <span className="text-xs text-[#8B6472]">Auto-saved 💕</span>
          )}
        </div>
      </footer>
    </div>
  );
}

// ---------- Step components ----------

type FormState = ReturnType<typeof getInitialForm>;
function getInitialForm() {
  return {
    creatorName: "",
    phone: "",
    intro: "",
    emotion: "",
    partnerName: "",
    relationship: "",
    story: "",
    specialMessage: "",
    finalMessage: "",
    signature: "",
    shareConsent: false,
    musicEnabled: false,
  };
}

function FieldCard({ children }: { children: React.ReactNode }) {
  return <div className="love-glass rounded-3xl p-5 sm:p-6 space-y-4">{children}</div>;
}

function StepStart({
  form,
  set,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <FieldCard>
      <div>
        <Label htmlFor="cn" className="text-[#3B1725] font-medium">
          Your name
        </Label>
        <Input
          id="cn"
          value={form.creatorName}
          onChange={(e) => set("creatorName", e.target.value)}
          placeholder="e.g. Aarav"
          className="mt-1.5 h-11 rounded-xl bg-white/70 border-pink-200/60"
          maxLength={50}
        />
      </div>
      <div className="rounded-2xl bg-white/50 border border-pink-200/50 px-4 py-3">
        <p className="text-sm text-[#8B6472]">
          No account or phone number required. Just add your name and create your love story. 💕
        </p>
      </div>
      <div>
        <Label htmlFor="in" className="text-[#3B1725] font-medium">
          A short intro <span className="text-[#8B6472] text-xs">(optional)</span>
        </Label>
        <Textarea
          id="in"
          value={form.intro}
          onChange={(e) => set("intro", e.target.value)}
          placeholder="I don't really know where to begin…"
          className="mt-1.5 rounded-xl bg-white/70 border-pink-200/60 min-h-[80px]"
          maxLength={300}
        />
      </div>
    </FieldCard>
  );
}

function StepEmotion({
  form,
  set,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <FieldCard>
      <div>
        <Label className="text-[#3B1725] font-medium">Pick the feeling</Label>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {EMOTIONS.map((em) => {
            const active = form.emotion === em.id;
            return (
              <button
                key={em.id}
                type="button"
                onClick={() => set("emotion", em.id)}
                className={`rounded-2xl p-3 text-left transition-all border ${
                  active
                    ? "love-btn border-0 text-white shadow-lg scale-[1.02]"
                    : "bg-white/70 border-pink-200/60 hover:border-pink-300"
                }`}
              >
                <div className="text-2xl mb-1">{em.emoji}</div>
                <div className="font-heading text-sm font-semibold">{em.label}</div>
                <div className={`text-[11px] leading-snug ${active ? "text-white/90" : "text-[#8B6472]"}`}>
                  {em.tagline}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label htmlFor="pn" className="text-[#3B1725] font-medium">
          Their name
        </Label>
        <Input
          id="pn"
          value={form.partnerName}
          onChange={(e) => set("partnerName", e.target.value)}
          placeholder="e.g. Meera"
          className="mt-1.5 h-11 rounded-xl bg-white/70 border-pink-200/60"
          maxLength={50}
        />
      </div>
      <div>
        <Label htmlFor="rel" className="text-[#3B1725] font-medium">
          Your relationship <span className="text-[#8B6472] text-xs">(optional)</span>
        </Label>
        <Input
          id="rel"
          value={form.relationship}
          onChange={(e) => set("relationship", e.target.value)}
          placeholder="the one I'd choose every single time"
          className="mt-1.5 h-11 rounded-xl bg-white/70 border-pink-200/60"
          maxLength={60}
        />
      </div>
    </FieldCard>
  );
}

function StepStory({
  form,
  set,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <FieldCard>
      <div>
        <Label htmlFor="st" className="text-[#3B1725] font-medium">
          Your story <span className="text-[#8B6472] text-xs">(20–3000 chars)</span>
        </Label>
        <Textarea
          id="st"
          value={form.story}
          onChange={(e) => set("story", e.target.value)}
          placeholder="Write from the heart. We'll reveal it line by line on their screen…"
          className="mt-1.5 rounded-xl bg-white/70 border-pink-200/60 min-h-[180px]"
          maxLength={3000}
        />
        <p className="text-[11px] text-[#8B6472] mt-1 text-right">{form.story.length}/3000</p>
      </div>
      <div>
        <Label htmlFor="sm" className="text-[#3B1725] font-medium">
          A special message <span className="text-[#8B6472] text-xs">(5–1500 chars)</span>
        </Label>
        <Textarea
          id="sm"
          value={form.specialMessage}
          onChange={(e) => set("specialMessage", e.target.value)}
          placeholder="One thing you want them to feel the moment they read this…"
          className="mt-1.5 rounded-xl bg-white/70 border-pink-200/60 min-h-[110px]"
          maxLength={1500}
        />
      </div>
      <div>
        <Label htmlFor="fm" className="text-[#3B1725] font-medium">
          Final message <span className="text-[#8B6472] text-xs">(optional, max 1000)</span>
        </Label>
        <Textarea
          id="fm"
          value={form.finalMessage}
          onChange={(e) => set("finalMessage", e.target.value)}
          placeholder="And if I could choose again… I would still choose you."
          className="mt-1.5 rounded-xl bg-white/70 border-pink-200/60 min-h-[90px]"
          maxLength={1000}
        />
      </div>
      <div>
        <Label htmlFor="sig" className="text-[#3B1725] font-medium">
          Signature <span className="text-[#8B6472] text-xs">(optional, max 100)</span>
        </Label>
        <Input
          id="sig"
          value={form.signature}
          onChange={(e) => set("signature", e.target.value)}
          placeholder="Forever Yours, Aarav ❤️"
          className="mt-1.5 h-11 rounded-xl bg-white/70 border-pink-200/60"
          maxLength={100}
        />
      </div>
      <div className="flex items-start gap-3 rounded-2xl bg-pink-50/70 p-3 border border-pink-200/50">
        <Switch
          id="sc"
          checked={form.shareConsent}
          onCheckedChange={(v) => set("shareConsent", v)}
        />
        <label htmlFor="sc" className="text-sm text-[#3B1725] leading-snug cursor-pointer">
          I consent to publish this story at a public link. I understand only the
          content above will be visible — never my phone number.
        </label>
      </div>
      <div className="flex items-start gap-3 rounded-2xl bg-white/60 p-3 border border-pink-200/40">
        <Switch
          id="mu"
          checked={form.musicEnabled}
          onCheckedChange={(v) => set("musicEnabled", v)}
        />
        <label htmlFor="mu" className="text-sm text-[#3B1725] leading-snug cursor-pointer">
          Add gentle ambient music to their experience (optional).
        </label>
      </div>
    </FieldCard>
  );
}

function StepMemories({
  draft,
  onUpload,
  onCaption,
  onDelete,
}: {
  draft: DraftDTO;
  onUpload: (f: File) => void;
  onCaption: (id: string, c: string) => void;
  onDelete: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ready = draft.images.filter((i) => i.state === "READY");
  const canAdd = ready.length < 4;

  return (
    <FieldCard>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#8B6472]">
            Add 2–4 photos. They become a swipeable memory album.
          </p>
          <p className="text-[11px] text-[#8B6472] mt-0.5">
            {ready.length}/4 added · JPG, PNG, WebP · max 10MB each
          </p>
        </div>
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!canAdd}
          className="love-btn border-0 rounded-full h-10 px-4 text-white disabled:opacity-40"
        >
          <Upload className="w-4 h-4" /> Add
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {draft.images.map((img) => (
          <div
            key={img.id}
            className="relative rounded-2xl overflow-hidden bg-white/70 border border-pink-200/60 group"
          >
            {img.state === "READY" ? (
              <img src={img.url} alt={img.caption ?? "memory"} className="w-full h-32 object-cover" />
            ) : img.state === "FAILED" ? (
              <div className="h-32 flex items-center justify-center text-xs text-red-600">
                Upload failed
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-[#FF4F81]" />
              </div>
            )}
            <button
              onClick={() => onDelete(img.id)}
              className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              aria-label="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
            <input
              value={img.caption ?? ""}
              onChange={(e) => onCaption(img.id, e.target.value)}
              placeholder="Add a caption…"
              maxLength={200}
              className="w-full px-2 py-1.5 text-xs bg-white/80 border-t border-pink-200/40 outline-none"
            />
          </div>
        ))}
      </div>
      {ready.length < 2 && (
        <p className="text-[11px] text-[#8B6472]">
          You need at least 2 photos to publish. {2 - ready.length} more to go.
        </p>
      )}
    </FieldCard>
  );
}

function StepPreview({
  form,
  draft,
  hasCredit,
  paying,
  publishing,
  onBuy,
  onPublish,
}: {
  form: FormState;
  draft: DraftDTO;
  hasCredit: boolean;
  paying: boolean;
  publishing: boolean;
  onBuy: () => void;
  onPublish: () => void;
}) {
  const emotion = EMOTIONS.find((e) => e.id === form.emotion);
  return (
    <div className="space-y-4">
      <div className="love-glass-strong rounded-3xl p-6 text-center relative overflow-hidden">
        <div className="love-glow absolute -top-8 left-1/2 -translate-x-1/2 w-56 h-28 love-glow-pulse" aria-hidden />
        <div className="relative z-10">
          <Heart className="w-9 h-9 mx-auto text-[#FF4F81] love-heartbeat mb-2" fill="currentColor" />
          <h2 className="font-heading text-xl text-[#3B1725] mb-1">Your love story is ready ✨</h2>
          <p className="text-sm text-[#8B6472] mb-4">
            For <span className="font-semibold text-[#3B1725]">{form.partnerName}</span> · {emotion?.emoji}{" "}
            {emotion?.label}
          </p>
          <div className="text-left rounded-2xl bg-white/60 p-3 border border-pink-200/40 max-h-60 overflow-y-auto love-scroll">
            <p className="text-xs text-[#8B6472] uppercase tracking-wide mb-1">Story preview</p>
            <p className="text-sm text-[#3B1725] whitespace-pre-line line-clamp-6">{form.story}</p>
          </div>
          <p className="text-xs text-[#8B6472] mt-3">
            {draft.images.filter((i) => i.state === "READY").length} photos ·{" "}
            {form.musicEnabled ? "music on" : "no music"}
          </p>
        </div>
      </div>

      {!hasCredit ? (
        <div className="love-glass rounded-3xl p-6 text-center">
          <div className="w-12 h-12 rounded-full love-btn flex items-center justify-center mx-auto mb-3">
            <IndianRupee className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-heading text-lg text-[#3B1725] mb-1">Buy credits to publish</h3>
          <p className="text-sm text-[#8B6472] mb-4">
            ₹9 gets you <b>2 love websites</b>. Pay once, publish twice.
          </p>
          <Button
            onClick={onBuy}
            disabled={paying}
            className="love-btn border-0 rounded-full h-12 px-8 text-white font-semibold"
          >
            {paying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing…
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Pay ₹9 · Get 2 credits
              </>
            )}
          </Button>
          <p className="text-[11px] text-[#8B6472] mt-2">
            Demo payment — no real charge. Verified server-side.
          </p>
        </div>
      ) : (
        <div className="love-glass rounded-3xl p-6 text-center">
          <Sparkles className="w-6 h-6 mx-auto text-[#FF4F81] mb-2" />
          <p className="text-sm text-[#8B6472] mb-4">
            You have a credit ready. Publishing will create a unique link like{" "}
            <code className="text-[#E93669]">#/love/a8F92kLm</code>.
          </p>
          <Button
            onClick={onPublish}
            disabled={publishing}
            className="love-btn border-0 rounded-full h-12 px-8 text-white font-semibold"
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Publishing…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Create my Love Website
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
