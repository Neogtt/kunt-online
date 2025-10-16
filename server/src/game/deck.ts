// server/src/game/deck.ts
import type { Card, Suit, Rank } from "./types";

const SUITS: Suit[] = ['H','D','C','S'];
const RANKS: Rank[] = [1,2,3,4,5,6,7,8,9,10,11,12,13];

// Mulberry32 RNG (seed'li)
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function singleDeck(copyIndex: number): Card[] {
  const out: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) {
    out.push({ suit: s, rank: r, id: `${s}${r}-d${copyIndex}-${Math.random().toString(36).slice(2,8)}` });
  }
  return out;
}

export function createTwoDecks(): Card[] {
  return [...singleDeck(1), ...singleDeck(2)];
}

export function shuffle(cards: Card[], seed: number = Date.now()): Card[] {
  const rng = mulberry32(seed >>> 0);
  const arr = cards.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Joker belirleme
function isRed(s: Suit){ return s==='H' || s==='D'; }
function isBlack(s: Suit){ return s==='C' || s==='S'; }

export function isJoker(card: Card, bottom: Card): boolean {
  if (card.rank !== bottom.rank) return false;
  if (isRed(bottom.suit) && isBlack(card.suit)) return true;
  if (isBlack(bottom.suit) && isRed(card.suit)) return true;
  return false;
}

export function initialDeal(seed: number = Date.now()) {
  let deck = shuffle(createTwoDecks(), seed);

  const players: Card[][] = [[],[],[],[]];
  for (let r=0; r<10; r++) for (let p=0; p<4; p++) players[p].push(deck.shift()!);

  const discardTop = deck.shift()!;
  const bottomCard = deck.pop()!; // en alttaki kart

  return { players, discardTop, bottomCard, stock: deck };
}

export function cardLabel(c: Card): string {
  const suit: Record<Suit,string> = {H:'♥',D:'♦',C:'♣',S:'♠'};
  const ranks: Record<number,string> = {1:'A',11:'J',12:'Q',13:'K'};
  return `${suit[c.suit]}${ranks[c.rank] ?? String(c.rank)}`;
}
