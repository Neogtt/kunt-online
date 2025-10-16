// server/src/game/state.ts
import type { Card, GameState, MoveAdd, MoveDiscard, MoveDraw, MoveOpen } from "./types";
import { initialDeal } from "./deck";
import { isValidPer, isValidRun, handPenalty } from "./rules";

const mod4 = (n:number)=> (n+4)%4;

export function newRound(seed?: number): GameState {
  const deal = initialDeal(seed);
  return {
    players: [
      { seat:0, hand: deal.players[0], score:0, eliminated:false },
      { seat:1, hand: deal.players[1], score:0, eliminated:false },
      { seat:2, hand: deal.players[2], score:0, eliminated:false },
      { seat:3, hand: deal.players[3], score:0, eliminated:false },
    ],
    turnSeat: 0,
    discardTop: deal.discardTop,
    bottomCard: deal.bottomCard,
    stock: deal.stock,
    melds: [],
    phase: "Draw",
    openedThisTurn: false,
    mustOpenThisTurn: false,
  };
}

function ensureTurn(gs: GameState, seat:number) {
  if (gs.turnSeat !== seat) throw new Error("Sıra sende değil.");
}
function takeFromHand(hand: Card[], id: string): Card {
  const i = hand.findIndex(c => c.id===id);
  if (i<0) throw new Error("Kart elinde değil.");
  const [c] = hand.splice(i,1);
  return c;
}

// ——— Moves ———
export function drawFromStock(gs: GameState, m: MoveDraw) {
  ensureTurn(gs, m.seat);
  if (gs.phase !== "Draw") throw new Error("Çekme fazı değil.");
  const c = gs.stock.shift();
  if (!c) throw new Error("Stok bitti.");
  gs.players[m.seat].hand.push(c);
  gs.phase = "Meld";
  gs.openedThisTurn = false;
}

export function drawFromDiscard(gs: GameState, m: MoveDraw) {
  ensureTurn(gs, m.seat);
  if (gs.phase !== "Draw") throw new Error("Çekme fazı değil.");
  if (!gs.discardTop) throw new Error("Yerde kart yok.");
  gs.players[m.seat].hand.push(gs.discardTop);
  gs.discardTop = undefined;
  gs.phase = "Meld";
  gs.openedThisTurn = false;
  gs.mustOpenThisTurn = true; // yerden alan bu tur en az bir meld açmak zorunda
}

export function openMeld(gs: GameState, m: MoveOpen) {
  ensureTurn(gs, m.seat);
  if (gs.phase !== "Meld") throw new Error("Açma fazı değil.");

  // Eldeki kartlarla birebir eşleşmeli
  const hand = gs.players[m.seat].hand;
  const ids = new Set(m.cards.map(c=>c.id));
  const picked = hand.filter(c=>ids.has(c.id));
  if (picked.length !== m.cards.length) throw new Error("Eldeki kartlarla uyuşmuyor.");

  if (!(isValidPer(picked, gs.bottomCard) || isValidRun(picked, gs.bottomCard)))
    throw new Error("Geçersiz per/seri.");

  gs.melds.push({ owner: m.seat, cards: picked });
  gs.players[m.seat].hand = hand.filter(c => !ids.has(c.id));

  gs.openedThisTurn = true;
  if (gs.mustOpenThisTurn) gs.mustOpenThisTurn = false;
}

export function addToMeld(gs: GameState, m: MoveAdd) {
  ensureTurn(gs, m.seat);
  if (gs.phase !== "Meld") throw new Error("Ekleme fazı değil.");

  const target = (m.meldId
    ? gs.melds.find(x=>x.id===m.meldId)
    : (m.meldIndex!=null ? gs.melds[m.meldIndex] : undefined));
  if (!target) throw new Error("Hedef seri bulunamadı.");

  const hand = gs.players[m.seat].hand;
  const idx = hand.findIndex(c => c.id === m.card.id);
  if (idx === -1) throw new Error("Kart elinde değil.");

  const trial = [...target.cards, hand[idx]];
  const ok = isValidPer(trial, gs.bottomCard) || isValidRun(trial, gs.bottomCard);
  if (!ok) throw new Error("Eklenince seri/per bozuluyor.");

  // uygula
  target.cards = trial;
  hand.splice(idx,1);
}

export function discard(gs: GameState, m: MoveDiscard) {
  ensureTurn(gs, m.seat);
  if (gs.phase !== "Meld") throw new Error("Atış fazı değil.");
  if (gs.mustOpenThisTurn) throw new Error("Yerden aldın; açmadan atamazsın.");

  const hand = gs.players[m.seat].hand;
  const card = takeFromHand(hand, m.card.id);
  gs.discardTop = card;

  if (hand.length === 0) {
    // KÜNT!
    endRound(gs, m.seat);
  } else {
    gs.phase = "Draw";
    gs.openedThisTurn = false;
    gs.turnSeat = mod4(gs.turnSeat + 1);
  }
}

export function endRound(gs: GameState, winnerSeat:number) {
  // Ceza yaz
  for (const p of gs.players) {
    if (p.seat === winnerSeat || p.eliminated) continue;
    const penalty = handPenalty(p.hand, gs.bottomCard);
    p.score += penalty;
    if (p.score >= 101) p.eliminated = true;
  }
  gs.phase = "RoundEnd";
}
