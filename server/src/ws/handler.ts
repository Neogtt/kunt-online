import { WebSocket } from "ws";
import type {
  Card,
  ClientGameState,
  ClientMessage,
  GamePhase,
  SeatIndex,
  ServerMessage,
} from "../../../shared/types.js";

const PLAYER_COUNT: SeatIndex[] = [0, 1, 2, 3];

type InternalPlayerState = {
  seat: SeatIndex;
  hand: Card[];
  knocked: boolean;
};

type InternalGameState = {
  roomId: string;
  bottomCard: Card;
  discardPile: Card[];
  deck: Card[];
  players: InternalPlayerState[];
  turnSeat: SeatIndex;
  phase: GamePhase;
  roundWinner: SeatIndex | null;
};

type Room = {
  id: string;
  sockets: Set<WebSocket>;
  state: InternalGameState | null;
};

const rooms = new Map<string, Room>();

export function getOrCreateRoom(roomId: string): Room {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      sockets: new Set<WebSocket>(),
      state: null,
    };
    rooms.set(roomId, room);
  }
  return room;
}

export function detachSocket(room: Room, ws: WebSocket) {
  room.sockets.delete(ws);
  if (room.sockets.size === 0) {
    rooms.delete(room.id);
  }
}

export function sendInitialState(room: Room, ws: WebSocket) {
  if (!room.state) return;
  safeSend(ws, {
    t: "state",
    state: toClientState(room.state),
  });
}

export function handleClientMessage(
  room: Room,
  ws: WebSocket,
  seat: SeatIndex,
  raw: string,
) {
  let payload: ClientMessage;
  try {
    payload = JSON.parse(raw) as ClientMessage;
  } catch {
    return sendError(ws, "Geçersiz JSON mesajı");
  }

  switch (payload.t) {
    case "start": {
      room.state = createInitialState(room.id);
      broadcast(room, { t: "state", state: toClientState(room.state) });
      return;
    }
    case "draw_stock": {
      const state = ensureState(room, ws);
      if (!state) return;
      if (state.turnSeat !== seat) return sendError(ws, "Sıra sizde değil");
      if (state.phase !== "draw") return sendError(ws, "Çekme fazında değilsiniz");
      if (!state.deck.length) return sendError(ws, "Destede kart kalmadı");

      const card = state.deck.pop()!;
      state.players[seat].hand.push(card);
      state.phase = "discard";
      broadcast(room, { t: "state", state: toClientState(state) });
      return;
    }
    case "draw_discard": {
      const state = ensureState(room, ws);
      if (!state) return;
      if (state.turnSeat !== seat) return sendError(ws, "Sıra sizde değil");
      if (state.phase !== "draw") return sendError(ws, "Çekme fazında değilsiniz");
      if (!state.discardPile.length) return sendError(ws, "Yerde kart yok");

      const card = state.discardPile.pop()!;
      state.players[seat].hand.push(card);
      state.phase = "discard";
      broadcast(room, { t: "state", state: toClientState(state) });
      return;
    }
    case "discard": {
      const state = ensureState(room, ws);
      if (!state) return;
      if (state.turnSeat !== seat) return sendError(ws, "Sıra sizde değil");
      if (state.phase !== "discard") return sendError(ws, "Atma fazında değilsiniz");

      const card = payload.card;
      const player = state.players[seat];
      const idx = player.hand.findIndex((c) => c.id === card.id);
      if (idx === -1) return sendError(ws, "Bu kart elinizde yok");

      const [removed] = player.hand.splice(idx, 1);
      state.discardPile.push(removed);

      if (player.hand.length === 0) {
        state.phase = "round_end";
        state.roundWinner = seat;
        broadcast(room, {
          t: "round_end",
          state: toClientState(state),
          winnerSeat: seat,
        });
        return;
      }

      state.turnSeat = nextSeat(state.turnSeat);
      state.phase = "draw";
      broadcast(room, { t: "state", state: toClientState(state) });
      return;
    }
    default:
      return sendError(ws, "Bilinmeyen mesaj tipi");
  }
}

function ensureState(room: Room, ws: WebSocket): InternalGameState | null {
  if (!room.state) {
    sendError(ws, "Oyun başlatılmadı");
    return null;
  }
  return room.state;
}

function broadcast(room: Room, msg: ServerMessage) {
  const data = JSON.stringify(msg);
  for (const socket of room.sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }
}

function safeSend(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendError(ws: WebSocket, message: string) {
  safeSend(ws, { t: "error", msg: message });
}

function createInitialState(roomId: string): InternalGameState {
  const deck = createDeck();
  const players: InternalPlayerState[] = PLAYER_COUNT.map((seat) => ({
    seat,
    hand: [],
    knocked: false,
  }));

  for (let i = 0; i < 14; i += 1) {
    for (const player of players) {
      const card = deck.pop();
      if (!card) throw new Error("Destede yeterli kart yok");
      player.hand.push(card);
    }
  }

  const bottomCard = deck.pop();
  if (!bottomCard) throw new Error("Alt kart bulunamadı");

  return {
    roomId,
    bottomCard,
    discardPile: [],
    deck,
    players,
    turnSeat: 0,
    phase: "draw",
    roundWinner: null,
  };
}

function createDeck(): Card[] {
  const suits: Card["suit"][] = ["H", "D", "C", "S"];
  const ranks: Card["rank"][] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const cards: Card[] = [];
  let idCounter = 0;

  for (let deckIndex = 0; deckIndex < 2; deckIndex += 1) {
    for (const suit of suits) {
      for (const rank of ranks) {
        cards.push({
          id: `${deckIndex}-${suit}${rank}-${idCounter}`,
          suit,
          rank,
        });
        idCounter += 1;
      }
    }
  }

  return shuffle(cards);
}

function shuffle<T>(arr: T[]): T[] {
  const cloned = [...arr];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

function toClientState(state: InternalGameState): ClientGameState {
  return {
    roomId: state.roomId,
    bottomCard: state.bottomCard,
    discardTop: state.discardPile[state.discardPile.length - 1] ?? null,
    stockCount: state.deck.length,
    discardCount: state.discardPile.length,
    turnSeat: state.turnSeat,
    phase: state.phase,
    roundWinner: state.roundWinner ?? null,
    players: state.players.map((p) => ({
      seat: p.seat,
      hand: [...p.hand],
      knocked: p.knocked,
    })),
  };
}

function nextSeat(seat: SeatIndex): SeatIndex {
  const next = (seat + 1) % PLAYER_COUNT.length;
  return next as SeatIndex;
}
