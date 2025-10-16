"use client";
import { useEffect, useRef, useState, useCallback } from "react";

type WSStatus = "connecting" | "open" | "closed";

export function useKuntSocket(roomId: string, seat: number, onMsg: (msg:any)=>void) {
  const wsRef = useRef<WebSocket|null>(null);
  const queueRef = useRef<any[]>([]);           // OPEN olmadan gelen mesajları sıraya al
  const [status, setStatus] = useState<WSStatus>("connecting");

  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (queueRef.current.length) {
      const data = queueRef.current.shift();
      ws.send(JSON.stringify(data));
    }
  }, []);

  useEffect(()=>{
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
      try { onMsg(JSON.parse(e.data)); } catch {}
    };

    ws.onclose = () => {
      setStatus("closed");
      console.log("❌ WS kapandı");
    };

    ws.onerror = (e) => console.error("WS error", e);

    return () => {
      try { ws.close(); } catch {}
      wsRef.current = null;
    };
  }, [roomId, seat, onMsg, flushQueue]);

  // Güvenli send: OPEN değilse kuyruğa at
  const send = useCallback((data:any) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      queueRef.current.push(data);
    }
  }, []);

  return { send, status };
}