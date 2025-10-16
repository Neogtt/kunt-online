"use client";
import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useGame } from "@/lib/store";
import { useKuntSocket, type WSStatus } from "@/lib/ws-client";
import type { Card, SeatIndex, ServerMessage } from "@shared/types";

const seatFromParam = (seatParam: number): SeatIndex => {
  if (Number.isInteger(seatParam) && seatParam >= 0 && seatParam <= 3) {
    return seatParam as SeatIndex;
  }
  return 0;
};

const statusText: Record<WSStatus, string> = {
  connecting: "Bağlanıyor",
  open: "Bağlı",
  closed: "Koptu",
};

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const seatParam = Number(sp.get("seat") ?? "0");
    const safeSeat = seatFromParam(seatParam);
  const roomId = String(id);

  const { state, setState, setSeat } = useGame();
  useEffect(() => {
    setSeat(safeSeat);
  }, [safeSeat, setSeat]);

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      if (msg.t === "state" || msg.t === "round_end") {
        setState(msg.state);
      }
      if (msg.t === "error") {
        alert(msg.msg);
      }
    },
    [setState],
  );
  const { send, status } = useKuntSocket(roomId, safeSeat, handleMessage);  

  // sayfa açılınca oyunu başlat (zararsız)
  useEffect(() => {
    send({ t: "start" });
  }, [send, safeSeat, roomId]);

  const me = useMemo(() => {
    if (!state) return null;
    return state.players[safeSeat] ?? null;
  }, [state, safeSeat]);

  const myTurn = state?.turnSeat === safeSeat;
  const canDrawStock = Boolean(state && myTurn && state.phase === "draw");
  const canDrawDiscard = Boolean(state && myTurn && state.phase === "draw" && state.discardTop);
  const canDiscard = Boolean(me && myTurn && state?.phase === "discard" && me.hand.length > 0);

  const drawStock = useCallback(() => send({ t: "draw_stock" }), [send]);
  const drawDiscard = useCallback(() => send({ t: "draw_discard" }), [send]);
  const discard = useCallback(() => {
    if (!me?.hand?.length) return;
    // şimdilik ilk kartı atıyoruz; bir sonraki adımda tıklayıp seçim ekleyeceğiz
    send({ t: "discard", card: me.hand[0] });
  }, [me, send]);
  const restart = useCallback(() => send({ t: "start" }), [send]);

  return (
    <div className="min-h-screen bg-green-900 text-white p-6 space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">
          Masa: {roomId} <span className="text-sm opacity-80">| Seat: {safeSeat + 1}</span>
        </h1>
        <span className="text-sm text-white/70">WS durumu: {statusText[status]}</span>
      </header>

      {!state && <p>Bağlanıyor...</p>}

      {state && (
        <div className="space-y-5">
          <section className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 bg-green-800/60 p-4 rounded">
            <InfoRow label="Alt Kart (Joker Belirleyici)" value={cardLabel(state.bottomCard)} />
            <InfoRow
              label="Yerdeki Kart"
              value={state.discardTop ? cardLabel(state.discardTop) : "—"}
            />
            <InfoRow label="Sıra" value={`Oyuncu ${state.turnSeat + 1}`} />
            <InfoRow label="Faz" value={state.phase} />
            <InfoRow label="Deste" value={`${state.stockCount} kart`} />
            <InfoRow label="Yerde" value={`${state.discardCount} kart`} />
          </section>

          {state.phase === "round_end" && state.roundWinner !== null && (
            <div className="bg-yellow-500/90 text-black px-4 py-3 rounded font-semibold flex items-center justify-between gap-4">
              <span>
                Tur bitti! Kazanan: Oyuncu {state.roundWinner + 1}
              </span>
              <button
                onClick={restart}
                className="bg-black/70 text-white px-3 py-1 rounded hover:bg-black/80"
              >
                Yeni Tur Başlat
              </button>
            </div>
          )}

          <section className="flex flex-wrap gap-2">
            <ActionButton onClick={drawStock} disabled={!canDrawStock}>
              Desteden Çek
            </ActionButton>
            <ActionButton onClick={drawDiscard} disabled={!canDrawDiscard}>
              Yerden Al
            </ActionButton>
            <ActionButton onClick={discard} disabled={!canDiscard}>
              At (ilk kart)
            </ActionButton>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Oyuncular</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {state.players.map((player) => (
                <div
                  key={player.seat}
                  className={`rounded border border-white/10 p-3 ${
                    player.seat === safeSeat ? "bg-white/10" : "bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Oyuncu {player.seat + 1}</span>
                    {state.turnSeat === player.seat && <span className="text-xs text-amber-300">Sıra</span>}
                  </div>
                  <p className="text-xs text-white/70 mt-1">Kart sayısı: {player.hand.length}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Elin</h2>
            <div className="w-full max-w-4xl flex flex-wrap gap-2 bg-green-800 p-3 rounded">
              {me?.hand?.map((card) => (
                <span key={card.id} className="bg-white text-black px-2 py-1 rounded font-bold">
                  {cardLabel(card)}
                </span>
              ))}
              {!me?.hand?.length && <span className="text-white/60">Kart yok</span>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-white/70 uppercase text-xs tracking-wide">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

type ActionButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
};

function ActionButton({ onClick, disabled, children }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded font-semibold transition ${
        disabled
          ? "bg-white/20 text-white/50 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-500"
      }`}
    >
      {children}
    </button>
  );
}

function cardLabel(card: Card): string {
  const suits: Record<Card["suit"], string> = { H: "♥", D: "♦", C: "♣", S: "♠" };
  const ranks: Partial<Record<Card["rank"], string>> = {
    1: "A",
    11: "J",
    12: "Q",
    13: "K",
  };
  return `${suits[card.suit]}${ranks[card.rank] ?? card.rank}`;
}
