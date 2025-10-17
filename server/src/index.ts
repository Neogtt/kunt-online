import Fastify from "fastify";
import { WebSocketServer } from "ws";
import { handleConnection } from "./ws/handler";

const app = Fastify();
const port = Number(process.env.PORT || 3001);

app.get("/", async () => ({ ok: true, name: "KÜNT server" }));

const wss = new WebSocketServer({ noServer: true });
wss.on("connection", handleConnection);

app.server.on("upgrade", (req, socket, head) => {
  try {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
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
