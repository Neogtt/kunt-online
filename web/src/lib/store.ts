"use client";
import { create } from "zustand";
import type { ClientGameState, SeatIndex } from "@shared/types";

type GameStore = {
  state: ClientGameState | null; // server'dan gelen oyun durumu
  setState: (s: ClientGameState | null) => void;
  seat: SeatIndex; // oyuncu koltuğu (0..3)
  setSeat: (n: SeatIndex) => void;
};

export const useGame = create<GameStore>((set) => ({
  state: null,
  setState: (s) => set({ state: s }),
  seat: 0,
  setSeat: (n) => set({ seat: n }),
}));
