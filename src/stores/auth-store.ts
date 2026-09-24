"use client";

import { create } from "zustand";

interface SessionUser {
  creatorId: string;
  name: string;
  phone: string;
}

interface AuthState {
  // session
  loaded: boolean;
  user: SessionUser | null;
  refresh: () => Promise<void>;
  setUser: (u: SessionUser | null) => void;
  // modal
  modalOpen: boolean;
  modalKey: number; // increments on each open to allow remount
  intent: "create" | "dashboard" | "generic";
  openAuth: (intent?: AuthState["intent"]) => void;
  closeAuth: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  loaded: false,
  user: null,
  async refresh() {
    const { apiSession } = await import("@/lib/client");
    const r = await apiSession();
    if (!r.success || !r.data.authenticated) {
      set({ user: null, loaded: true });
      return;
    }
    set({
      user: {
        creatorId: r.data.creatorId!,
        name: r.data.name!,
        phone: r.data.phone!,
      },
      loaded: true,
    });
  },
  setUser(u) {
    set({ user: u, loaded: true });
  },
  modalOpen: false,
  modalKey: 0,
  intent: "generic",
  openAuth(intent = "generic") {
    set((s) => ({ modalOpen: true, modalKey: s.modalKey + 1, intent }));
  },
  closeAuth() {
    set({ modalOpen: false });
  },
}));

export function useRequireAuth() {
  const { user, loaded, openAuth } = useAuth();
  return (action: AuthState["intent"] = "generic") => {
    if (!loaded || !user) {
      openAuth(action);
      return false;
    }
    return true;
  };
}
