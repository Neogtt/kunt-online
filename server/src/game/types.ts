// server/src/game/types.ts
export type Suit = 'H'|'D'|'C'|'S';
export type Rank = 1|2|3|4|5|6|7|8|9|10|11|12|13; // A=1, J=11, Q=12, K=13

export type Card = { suit: Suit; rank: Rank; id: string };

export type PlayerState = {
  seat: number;
  hand: Card[];
  score: number;
  eliminated: boolean;
};

export type Meld = { id?: string; owner: number; cards: Card[] };

export type Phase = "Draw" | "Meld" | "RoundEnd";

export type GameState = {
  players: PlayerState[];
  turnSeat: number;
  discardTop?: Card;
  bottomCard: Card;
  stock: Card[];
  melds: Meld[];
  phase: Phase;
  openedThisTurn: boolean;
  mustOpenThisTurn?: boolean;   // yerden çeken için açma zorunluluğu
};

export type MoveDraw = { t:"draw_stock"|"draw_discard"; seat:number };
export type MoveOpen = { t:"open_meld"; seat:number; cards: Card[] };
export type MoveAdd  = { t:"add_to_meld"; seat:number; card: Card; meldId?: string; meldIndex?: number };
export type MoveDiscard = { t:"discard"; seat:number; card: Card };

export type ClientMsg =
  | { t:"start" }
  | { t:"draw_stock" }
  | { t:"draw_discard" }
  | { t:"open_meld"; cards: Card[] }
  | { t:"add_to_meld"; card: Card; meldId?: string; meldIndex?: number }
  | { t:"discard"; card: Card };

export type ServerMsg =
  | { t:"state"; state: GameState }
  | { t:"round_end"; state: GameState }
  | { t:"error"; code: string; msg: string };
