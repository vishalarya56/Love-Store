"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  IndianRupee,
  CreditCard,
} from "lucide-react";
import { useNavigate } from "@/hooks/use-hash-route";
import { useAuth } from "@/stores/auth-store";
import {
  apiListWebsites,
  apiDeleteWebsite,
  apiGetCredits,
  apiCreateOrder,
  apiVerifyPayment,
  type WebsiteDTO,
  isApiError,
} from "@/lib/client";
import { EMOTION_MAP } from "@/lib/emotions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loaded, refresh } = useAuth();
  const [websites, setWebsites] = useState<WebsiteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<{ total: number; used: number; remaining: number } | null>(null);
  const [paying, setPaying] = useState(false);

  const loadAll = async () => {
    const [w, c] = await Promise.all([apiListWebsites(), apiGetCredits()]);
    if (w.success) setWebsites(w.data);
    if (c.success) setCredits(c.data);
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      await refresh();
      await loadAll();
    })();
  }, []);

  async function handleBuy() {
    setPaying(true);
    const order = await apiCreateOrder();
    if (isApiError(order)) {
      setPaying(false);
      toast({ title: "Payment failed", description: order.error.message, variant: "destructive" });
      return;
    }
    await new Promise((r) => setTimeout(r, 900));
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
    toast({ title: `+${verify.data.creditsGranted} credits added 💕` });
  }

  async function handleDelete(id: string) {
    const r = await apiDeleteWebsite(id);
    if (r.success) {
      setWebsites((prev) => prev.filter((w) => w.id !== id));
      toast({ title: "Love story removed" });
      loadAll();
    } else {
      toast({ title: "Couldn't delete", description: r.error.message, variant: "destructive" });
    }
  }

  if (!loaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--love-grad-bg)" }}>
        <Heart className="w-8 h-8 text-[#FF4F81] love-heartbeat" fill="currentColor" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col love-viewport" style={{ background: "var(--love-grad-bg)" }}>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/50 border-b border-pink-200/40">
        <div className="mx-auto max-w-4xl px-5 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-[#3B1725] font-heading font-bold">
            <div className="w-7 h-7 rounded-full love-btn flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="white" />
            </div>
            LoveStory
          </button>
          <Button
            onClick={() => navigate("/create")}
            className="love-btn border-0 rounded-full h-9 px-4 text-white"
          >
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </header>

      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="love-section-title font-heading text-[#3B1725] mb-1"
          >
            Hi {user?.name} 💕
          </motion.h1>
          <p className="text-[#8B6472] mb-6">Your love stories, all in one place.</p>

          {/* Credits card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="love-glass-strong rounded-3xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <p className="text-sm text-[#8B6472]">Credits</p>
              <p className="font-heading text-3xl text-[#3B1725]">
                {credits?.remaining ?? 0}{" "}
                <span className="text-base text-[#8B6472] font-sans">
                  / {credits?.total ?? 0} left
                </span>
              </p>
              <p className="text-[11px] text-[#8B6472] mt-1">
                {credits?.used ?? 0} used · 1 credit per published love story
              </p>
            </div>
            <Button
              onClick={handleBuy}
              disabled={paying}
              className="love-btn border-0 rounded-full h-11 px-6 text-white font-semibold"
            >
              {paying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              ) : (
                <><IndianRupee className="w-4 h-4" /> Buy ₹9 · +2 credits</>
              )}
            </Button>
          </motion.div>

          {/* Websites list */}
          <h2 className="font-heading text-lg text-[#3B1725] mb-3">Your published stories</h2>
          {websites.length === 0 ? (
            <div className="love-glass rounded-3xl p-10 text-center">
              <div className="w-14 h-14 rounded-full love-btn flex items-center justify-center mx-auto mb-3">
                <Heart className="w-7 h-7 text-white" fill="white" />
              </div>
              <h3 className="font-heading text-lg text-[#3B1725] mb-1">No stories yet</h3>
              <p className="text-sm text-[#8B6472] mb-4">
                Create your first love story and share a magical link.
              </p>
              <Button
                onClick={() => navigate("/create")}
                className="love-btn border-0 rounded-full h-11 px-6 text-white"
              >
                <Plus className="w-4 h-4" /> Create a Love Story
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {websites.map((w, i) => {
                const em = EMOTION_MAP[w.emotion as keyof typeof EMOTION_MAP];
                return (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="love-glass rounded-3xl p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-2xl">{em?.emoji}</div>
                        <h3 className="font-heading text-base text-[#3B1725] mt-1">
                          For {w.partnerName}
                        </h3>
                        <p className="text-xs text-[#8B6472]">
                          {em?.label} · by {w.creatorName}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold uppercase">
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8B6472] font-mono break-all">
                      {w.url}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/love/${w.slug}`)}
                        className="love-btn border-0 rounded-full text-white h-9 flex-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 rounded-full border-pink-200/60 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[28px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-heading text-[#3B1725]">
                              Delete this love story?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the public link. The recipient won't be
                              able to open it anymore. This can't be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(w.id)}
                              className="rounded-full bg-red-500 text-white hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {credits && credits.remaining === 0 && (
            <div className="love-glass rounded-3xl p-5 mt-6 text-center">
              <CreditCard className="w-6 h-6 mx-auto text-[#FF4F81] mb-2" />
              <p className="text-sm text-[#8B6472]">
                You're out of credits. Buy more to publish new love stories.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-auto bg-white/50 border-t border-pink-200/40 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-5 py-5 text-xs text-[#8B6472] flex items-center gap-1.5">
          <Heart className="w-3 h-3 text-[#FF4F81]" fill="currentColor" />
          Made with love · LoveStory
        </div>
      </footer>
    </div>
  );
}
