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
  loading: boolean;
  pendingAuthorize: string | null;
  setUser: (u: SessionUser | null) => void;
  setLoading: (b: boolean) => void;
  setPendingAuthorize: (s: string | null) => void;
  refreshSession: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  loading: true,
  pendingAuthorize: null,
  setUser: (u) => set({ user: u }),
  setLoading: (b) => set({ loading: b }),
  setPendingAuthorize: (s) => set({ pendingAuthorize: s }),
  refreshSession: async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) {
        // API returned error (500 etc) - don't loop, just show login
        set({ user: null, loading: false });
        return;
      }
      const data = await res.json();
      set({ user: data.loggedIn ? data.user : null, pendingAuthorize: data.pendingAuthorize || null, loading: false });
    } catch {
      // Network error - don't loop, just show login
      set({ user: null, loading: false });
    }
  },
}));
