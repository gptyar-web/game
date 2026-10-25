import { create } from "zustand";
import { persist } from "zustand/middleware";
interface UIState {
  matchId: string | null;
  viewTeam: string | null;
  sound: boolean;
  reduceMotion: boolean;
  notifications: boolean;
  tutorialDone: boolean;
  mobileOpen: boolean;
  selectedId: string | null;
  set: (value: Partial<UIState>) => void;
}
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      matchId: null,
      viewTeam: null,
      sound: false,
      reduceMotion: false,
      notifications: true,
      tutorialDone: false,
      mobileOpen: false,
      selectedId: null,
      set: (value) => set(value),
    }),
    {
      name: "game-preferences-v1",
      partialize: (s) => ({
        matchId: s.matchId,
        sound: s.sound,
        reduceMotion: s.reduceMotion,
        notifications: s.notifications,
        tutorialDone: s.tutorialDone,
      }),
    },
  ),
);
