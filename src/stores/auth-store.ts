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
    const { apiSession, apiGuestSession } = await import("@/lib/client");
    const r = await apiSession();
    if (r.success && r.data.authenticated) {
      set({
        user: {
          creatorId: r.data.creatorId!,
          name: r.data.name!,
          phone: r.data.phone!,
        },
        loaded: true,
      });
      return;
    }

    // Login-free mode: create an anonymous creator/session automatically.
    const guest = await apiGuestSession();
    if (guest.success) {
      set({
        user: guest.data,
        loaded: true,
      });
    } else {
      set({ user: null, loaded: true });
    }
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
  const { loaded } = useAuth();
  return (_action: AuthState["intent"] = "generic") => loaded;
}
