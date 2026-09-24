"use client";

import { useEffect, useState } from "react";
import { useHashRoute, navigate } from "@/hooks/use-hash-route";
import { useAuth } from "@/stores/auth-store";
import LandingPage from "@/components/landing/LandingPage";
import CreatorFlow from "@/components/create/CreatorFlow";
import Dashboard from "@/components/dashboard/Dashboard";
import LoveExperience from "@/components/love/LoveExperience";

function NotFoundView() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-5" style={{ background: "var(--love-grad-bg)" }}>
      <div className="text-6xl mb-4">💔</div>
      <h1 className="font-heading text-2xl text-[#3B1725] mb-2">Page not found</h1>
      <p className="text-[#8B6472] mb-6">This love story doesn't exist here.</p>
      <button
        onClick={() => navigate("/")}
        className="love-btn rounded-full h-11 px-6 text-white font-semibold border-0"
      >
        ← Back to LoveStory
      </button>
    </div>
  );
}

export default function Home() {
  const route = useHashRoute();
  const { refresh } = useAuth();
  const [authReady, setAuthReady] = useState(false);

  // Load session once on mount.
  useEffect(() => {
    refresh().finally(() => setAuthReady(true));
  }, [refresh]);

  // Open the auth modal once per mount so returning users land cleanly.
  useEffect(() => {
    // nothing — modal is triggered on demand.
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--love-grad-bg)" }}>
        <div className="love-heartbeat text-[#FF4F81]" aria-label="loading">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 21s-7.5-4.5-9.5-9.5C1 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 23 7.5 21.5 11.5 19.5 16.5 12 21 12 21z" />
          </svg>
        </div>
      </div>
    );
  }

  let view: React.ReactNode = null;
  switch (route.name) {
    case "landing":
      view = <LandingPage />;
      break;
    case "create":
      view = <CreatorFlow key={route.params.draftId ?? "new"} draftId={route.params.draftId} />;
      break;
    case "dashboard":
      view = <Dashboard />;
      break;
    case "love":
      view = <LoveExperience slug={route.params.slug!} />;
      break;
    default:
      view = <NotFoundView />;
  }

  return (
    <>
      {view}
    </>
  );
}
