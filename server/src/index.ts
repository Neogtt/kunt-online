import Fastify from "fastify";
import { WebSocketServer } from "ws";

const app = Fastify();
const port = Number(process.env.PORT || 3001);

// HTTP test endpoint
app.get("/", async () => ({ ok: true, name: "KÜNT server" }));

// WS server
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  console.log("✅ Yeni WS bağlantısı");
  ws.send(JSON.stringify({ t: "hello", msg: "KÜNT WS bağlandı" }));

  ws.on("message", (raw) => {
    const msg = raw.toString();
    console.log("📩 Gelen:", msg);
    ws.send(JSON.stringify({ t: "echo", data: msg }));
  });
});

// HTTP → WS köprüsü
app.server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

app.listen({ port, host: "0.0.0.0" }, (err, addr) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`🚀 KÜNT server: ${addr} (WS upgrade açık)`);
});