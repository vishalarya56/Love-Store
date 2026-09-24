"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/stores/auth-store";
import { apiSendOtp, apiVerifyOtp } from "@/lib/client";
import { useNavigate } from "@/hooks/use-hash-route";
import { toast } from "@/hooks/use-toast";
import { Loader2, Heart, ShieldCheck } from "lucide-react";

type Step = "details" | "otp";

export function AuthModal() {
  const { modalOpen, modalKey, intent, closeAuth, setUser } = useAuth();
  const navigate = useNavigate();

  return (
    <Dialog open={modalOpen} onOpenChange={(o) => !o && closeAuth()}>
      <DialogContent className="love-glass-strong rounded-[28px] border-pink-200/60 p-0 overflow-hidden max-w-md">
        <AuthForm
          key={modalKey}
          intent={intent}
          onAuthenticated={(u) => {
            setUser(u);
            closeAuth();
            toast({ title: `Welcome, ${u.name} 💕`, description: "You're signed in." });
            if (intent === "create") navigate("/create");
            else if (intent === "dashboard") navigate("/dashboard");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AuthForm({
  intent,
  onAuthenticated,
}: {
  intent: "create" | "dashboard" | "generic";
  onAuthenticated: (u: { creatorId: string; name: string; phone: string }) => void;
}) {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpShown, setOtpShown] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errName, setErrName] = useState("");
  const [errPhone, setErrPhone] = useState("");
  const [errCode, setErrCode] = useState("");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrName("");
    setErrPhone("");
    setBusy(true);
    const r = await apiSendOtp(name.trim(), phone.trim());
    setBusy(false);
    if (!r.success) {
      const fe = r.error.fieldErrors ?? {};
      if (fe.name) setErrName(fe.name);
      if (fe.phone) setErrPhone(fe.phone);
      if (!fe.name && !fe.phone) setErrPhone(r.error.message);
      return;
    }
    setOtpShown(r.data.otp); // demo convenience — would be an SMS in production
    setStep("otp");
    toast({
      title: "Code sent",
      description: "For this demo, we've shown the code below.",
    });
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setErrCode("");
    setBusy(true);
    const r = await apiVerifyOtp(phone.trim(), code.trim());
    setBusy(false);
    if (!r.success) {
      setErrCode(r.error.message);
      return;
    }
    onAuthenticated({
      creatorId: r.data.creatorId,
      name: r.data.name,
      phone: r.data.phone,
    });
  }

  function autoFill() {
    setCode(otpShown ?? "");
  }

  return (
    <div className="px-7 py-8">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-14 h-14 rounded-full love-btn flex items-center justify-center mb-3 shadow-lg">
          <Heart className="w-7 h-7 text-white" fill="white" />
        </div>
        <DialogTitle className="font-heading text-2xl text-[#3B1725]">
          {step === "details" ? "Sign in to LoveStory" : "Enter your code"}
        </DialogTitle>
        <DialogDescription className="text-[#8B6472] mt-1">
          {step === "details"
            ? "We'll send a one-time code to your phone."
            : "Check the code we just sent."}
        </DialogDescription>
      </div>

      {step === "details" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[#3B1725]">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav"
              autoComplete="name"
              className="h-11 rounded-xl bg-white/70 border-pink-200/60"
            />
            {errName && <p className="text-xs text-red-600">{errName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-[#3B1725]">Phone (Indian mobile)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              inputMode="numeric"
              autoComplete="tel"
              className="h-11 rounded-xl bg-white/70 border-pink-200/60"
            />
            {errPhone && <p className="text-xs text-red-600">{errPhone}</p>}
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-xl love-btn border-0 hover:opacity-90 text-white font-semibold"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send code"}
          </Button>
          <p className="text-[11px] text-[#8B6472] text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Your number is never shared with the recipient.
          </p>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          {otpShown && (
            <div className="rounded-xl bg-pink-50 border border-pink-200 px-3 py-2 text-center">
              <p className="text-xs text-[#8B6472]">Demo code (shown for convenience)</p>
              <p className="font-mono text-lg tracking-[0.4em] text-[#E93669] font-semibold">{otpShown}</p>
              <button type="button" onClick={autoFill} className="text-xs underline text-[#FF4F81] mt-1">
                Auto-fill
              </button>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-[#3B1725]">6-digit code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              className="h-12 rounded-xl bg-white/70 border-pink-200/60 text-center tracking-[0.5em] text-lg"
            />
            {errCode && <p className="text-xs text-red-600">{errCode}</p>}
          </div>
          <Button
            type="submit"
            disabled={busy || code.length !== 6}
            className="w-full h-11 rounded-xl love-btn border-0 hover:opacity-90 text-white font-semibold"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & continue"}
          </Button>
          <button
            type="button"
            onClick={() => setStep("details")}
            className="w-full text-xs text-[#8B6472] hover:text-[#FF4F81]"
          >
            ← Back
          </button>
        </form>
      )}
      <DialogHeader className="sr-only">
        <DialogTitle>LoveStory sign in</DialogTitle>
        <DialogDescription>{intent === "create" ? "Sign in to create a love story" : "Sign in to continue"}</DialogDescription>
      </DialogHeader>
    </div>
  );
}
