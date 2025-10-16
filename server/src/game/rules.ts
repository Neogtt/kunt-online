// server/src/game/rules.ts
import type { Card } from "./types";
import { isJoker } from "./deck";

// PER: aynı rank, farklı suit, >=3 (tamamı joker olamaz)
export function isValidPer(cards: Card[], bottom: Card): boolean {
  if (cards.length < 3) return false;
  const non = cards.filter(c => !isJoker(c, bottom));
  if (non.length === 0) return false;
  const ranks = new Set(non.map(c => c.rank));
  if (ranks.size !== 1) return false;
  const suits = non.map(c => c.suit);
  if (new Set(suits).size !== suits.length) return false; // suit tekrar etmez
  return true;
}

// SERİ: aynı suit, ardışık, >=3, K-A-2 YOK (tamamı joker olamaz)
export function isValidRun(cards: Card[], bottom: Card): boolean {
  if (cards.length < 3) return false;
  const non = cards.filter(c => !isJoker(c, bottom)).sort((a,b)=>a.rank-b.rank);
  if (non.length === 0) return false;
  const suit = non[0].suit;
  if (non.some(c => c.suit !== suit)) return false;

  const ranks = non.map(c => c.rank);
  if (ranks.includes(13) && ranks.includes(1)) return false; // K-A köprü yasak

  // gap say: [5,7,8] => 1 boşluk
  let gaps = 0;
  for (let i=1;i<ranks.length;i++){
    const d = ranks[i] - ranks[i-1];
    if (d <= 0) return false; // tekrar/geri gidiş yok
    gaps += (d-1);
  }
  const jokers = cards.filter(c => isJoker(c,bottom)).length;
  return jokers >= gaps;
}

// Ceza (elde açılmamış kartlar)
export function cardPenalty(card: Card, bottom: Card): number {
  if (isJoker(card, bottom)) return card.rank; // Joker boşa kaldıysa kendi sayısı
  if (card.rank === 1) return 11;             // As = 11
  if (card.rank >= 10) return 10;             // 10/J/Q/K = 10
  return card.rank;                            // 2..9 = kendi değeri
}
export function handPenalty(cards: Card[], bottom: Card): number {
  return cards.reduce((s,c)=>s+cardPenalty(c,bottom),0);
}
