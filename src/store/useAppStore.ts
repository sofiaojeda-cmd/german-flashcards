"use client";

import { create } from "zustand";
import type { UserProgress } from "@/types";

type AppStore = {
  progress: UserProgress | null;
  setProgress: (p: UserProgress) => void;
  addXP: (amount: number) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  progress: null,

  setProgress: (p) => set({ progress: p }),

  addXP: (amount) =>
    set((state) => {
      if (!state.progress) return state;
      return {
        progress: {
          ...state.progress,
          xp: state.progress.xp + amount,
        },
      };
    }),
}));
