export type Suit = "H" | "D" | "C" | "S";
export type Rank =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13;
export type SeatIndex = 0 | 1 | 2 | 3;

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type GamePhase = "waiting" | "draw" | "discard" | "round_end";

export type PlayerView = {
  seat: SeatIndex;
  hand: Card[];
  knocked: boolean;
};

export type ClientGameState = {
  roomId: string;
  bottomCard: Card;
  discardTop: Card | null;
  stockCount: number;
  discardCount: number;
  turnSeat: SeatIndex;
  phase: GamePhase;
  roundWinner: SeatIndex | null;
  players: PlayerView[];
};

export type ServerMessage =
  | { t: "hello"; roomId: string; seat: SeatIndex }
  | { t: "state"; state: ClientGameState }
  | { t: "round_end"; state: ClientGameState; winnerSeat: SeatIndex }
  | { t: "error"; msg: string };

export type ClientMessage =
  | { t: "start" }
  | { t: "draw_stock" }
  | { t: "draw_discard" }
  | { t: "discard"; card: Card };
