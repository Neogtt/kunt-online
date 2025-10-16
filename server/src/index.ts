import Fastify from "fastify";
import { WebSocketServer } from "ws";
import type { SeatIndex } from "../../shared/types.js";
import {
  detachSocket,
  getOrCreateRoom,
  handleClientMessage,
  sendInitialState,
} from "./ws/handler.js";

const app = Fastify();
const port = Number(process.env.PORT || 3001);

// HTTP test endpoint
app.get("/", async () => ({ ok: true, name: "KÜNT server" }));

// WS server
const wss = new WebSocketServer({ noServer: true });

type UpgradeRequest = {
  kuntRoomId: string;
  kuntSeat: SeatIndex;
};

wss.on("connection", (ws, req) => {
  const upgradeData = req as unknown as Partial<UpgradeRequest>;
  const roomId = upgradeData.kuntRoomId ?? (ws as any).kuntRoomId;
  const seat = upgradeData.kuntSeat ?? (ws as any).kuntSeat;

  if (!roomId || typeof roomId !== "string" || seat === undefined) {
    ws.close(1008, "Eksik oda veya koltuk bilgisi");
    return;
  }

  const room = getOrCreateRoom(roomId);
  room.sockets.add(ws);

  console.log(`✅ Yeni WS bağlantısı | oda=${roomId} seat=${seat}`);
  ws.send(JSON.stringify({ t: "hello", roomId, seat }));

  sendInitialState(room, ws);

  ws.on("message", (raw) => {
    handleClientMessage(room, ws, seat as SeatIndex, raw.toString());
  });

  ws.on("close", () => {
    detachSocket(room, ws);
    console.log(`👋 WS kapandı | oda=${roomId} seat=${seat}`);
  });

  ws.on("error", (err) => {
    console.error("WS hatası", err);
  });
});

// HTTP → WS köprüsü
app.server.on("upgrade", (req, socket, head) => {
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    const roomId = url.searchParams.get("room");
    const seatParam = Number(url.searchParams.get("seat") ?? "0");

    if (!roomId || !Number.isInteger(seatParam) || seatParam < 0 || seatParam > 3) {
      socket.destroy();
      return;
    }

    const seat = seatParam as SeatIndex;
    (req as unknown as UpgradeRequest).kuntRoomId = roomId;
    (req as unknown as UpgradeRequest).kuntSeat = seat;

    wss.handleUpgrade(req, socket, head, (ws) => {
      (ws as any).kuntRoomId = roomId;
      (ws as any).kuntSeat = seat;
      wss.emit("connection", ws, req);
    });
  } catch (error) {
    console.error("WS upgrade hatası", error);
    socket.destroy();
  }
});

app.listen({ port, host: "0.0.0.0" }, (err, addr) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 KÜNT server: ${addr} (WS upgrade açık)`);
  
});
