"use client";

import { create } from "zustand";

export interface SessionUser {
  id: string;
  externalId: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  trustLevel: number;
  isAdmin: boolean;
  isModerator: boolean;
  isBanned: boolean;
}

interface AppState {
  user: SessionUser | null;
  pendingAuthorize: string | null;
  setUser: (u: SessionUser | null) => void;
  refreshSession: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  pendingAuthorize: null,
  setUser: (u) => set({ user: u }),
  refreshSession: async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        set({ user: null });
        return;
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        set({ user: data.loggedIn ? data.user : null, pendingAuthorize: data.pendingAuthorize || null });
      } catch {
        set({ user: null });
      }
    } catch {
      set({ user: null });
    }
  },
}));
