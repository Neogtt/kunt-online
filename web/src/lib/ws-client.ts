"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { ClientMessage, ServerMessage } from "@shared/types";

export type WSStatus = "connecting" | "open" | "closed";

type UseKuntSocketResult = {
  send: (data: ClientMessage) => void;
  status: WSStatus;
};

export function useKuntSocket(
  roomId: string,
  seat: number,
  onMsg: (msg: ServerMessage) => void,
): UseKuntSocketResult {
  const wsRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<ClientMessage[]>([]); // OPEN olmadan gelen mesajları sıraya al
  const [status, setStatus] = useState<WSStatus>("connecting");

  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (queueRef.current.length) {
      const data = queueRef.current.shift();
      if (data) ws.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    const url = `ws://localhost:3001/?room=${encodeURIComponent(roomId)}&seat=${seat}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      setStatus("open");
      flushQueue();
      console.log("🔗 WS bağlandı:", url);
    };

    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as ServerMessage;
        onMsg(parsed);
      } catch (error) {
        console.error("WS mesajı parse edilemedi", error);
      }
    };

    ws.onclose = () => {
      setStatus("closed");
      console.log("❌ WS kapandı");
    };

    ws.onerror = (e) => console.error("WS error", e);

    return () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
  }, [roomId, seat, onMsg, flushQueue]);

  // Güvenli send: OPEN değilse kuyruğa at
  const send = useCallback((data: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      queueRef.current.push(data);
    }
  }, []);

  return { send, status };
}
