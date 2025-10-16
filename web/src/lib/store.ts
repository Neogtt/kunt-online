"use client";
import { create } from "zustand";

type GameStore = {
  state: any | null;          // server'dan gelen oyun durumu
  setState: (s:any)=>void;
  seat: number;               // oyuncu koltuğu (0..3)
  setSeat: (n:number)=>void;
};

export const useGame = create<GameStore>((set)=>({
  state: null,
  setState: (s)=>set({ state: s }),
  seat: 0,
  setSeat: (n)=>set({ seat: n }),
}));