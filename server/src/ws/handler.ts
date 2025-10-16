// server/src/ws/handler.ts
import { WebSocket } from "ws";
import { GameState, ClientMsg, ServerMsg } from "../game/types";
import { newRound, drawFromStock, drawFromDiscard, openMeld, addToMeld, discard } from "../game/state";

type Room = {
  id: string;
  conns: Map<number, WebSocket>; // seat -> ws
  state: GameState;
  started: boolean;
};

const rooms = new Map<string, Room>();

function broadcast(room: Room, msg: ServerMsg) {
  const data = JSON.stringify(msg);
  for (const ws of room.conns.values()) ws.send(data);
}
function send(ws: WebSocket, msg: ServerMsg) {
  ws.send(JSON.stringify(msg));
}

export function handleConnection(ws: WebSocket, req: any) {
  const url = new URL(req.url, "http://localhost");
  const roomId = url.searchParams.get("room") ?? "default";
  const seat = Number(url.searchParams.get("seat") ?? "0");

  let room = rooms.get(roomId);
  if (!room) {
    room = { id: roomId, conns: new Map(), state: newRound(Date.now()), started: true };
    rooms.set(roomId, room);
  }
  room.conns.set(seat, ws);

  // ilk state
  send(ws, { t:"state", state: room.state });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientMsg;
      switch (msg.t) {
        case "start":
          // round zaten var; istenirse yeniden dağıtma mekaniğini sonra ekleriz
          broadcast(room!, { t:"state", state: room!.state });
          break;

        case "draw_stock":
          drawFromStock(room!.state, { t:"draw_stock", seat });
          broadcast(room!, { t:"state", state: room!.state });
          break;

        case "draw_discard":
          drawFromDiscard(room!.state, { t:"draw_discard", seat });
          broadcast(room!, { t:"state", state: room!.state });
          break;

        case "open_meld":
          openMeld(room!.state, { t:"open_meld", seat, cards: msg.cards });
          broadcast(room!, { t:"state", state: room!.state });
          break;

        case "add_to_meld":
          addToMeld(room!.state, { t:"add_to_meld", seat, card: msg.card, meldId: msg.meldId, meldIndex: msg.meldIndex });
          broadcast(room!, { t:"state", state: room!.state });
          break;

        case "discard":
          discard(room!.state, { t:"discard", seat, card: msg.card });
          if (room!.state.phase === "RoundEnd") {
            broadcast(room!, { t:"round_end", state: room!.state });
          } else {
            broadcast(room!, { t:"state", state: room!.state });
          }
          break;

        default:
          send(ws, { t:"error", code:"UNKNOWN", msg:"Bilinmeyen mesaj tipi." });
      }
    } catch (e:any) {
      send(ws, { t:"error", code:"EX", msg: e.message ?? "Hata" });
    }
  });

  ws.on("close", () => {
    room!.conns.delete(seat);
    if (room!.conns.size === 0) rooms.delete(room!.id);
  });
}
