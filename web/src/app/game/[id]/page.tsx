"use client";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useKuntSocket } from "@/lib/ws-client";
import { useGame } from "@/lib/store";

export default function GamePage() {
  const { id } = useParams();
  const sp = useSearchParams();
  const seatParam = Number(sp.get("seat") ?? "0");

  const { state, setState, seat, setSeat } = useGame();
  useEffect(()=>{ setSeat(seatParam); }, [seatParam, setSeat]);

  const { send } = useKuntSocket(String(id), seat, (msg)=>{
    // server mesajları: {t:"state", state} veya {t:"round_end", state, closestTo101}
    if (msg.t === "state" || msg.t === "round_end") setState(msg.state);
    if (msg.t === "error") alert(msg.msg);
  });

  // sayfa açılınca oyunu başlat (zararsız)
  useEffect(()=>{ send({ t:"start" }); }, [send]);

  const me = useMemo(()=> state?.players?.[seat], [state, seat]);

  const drawStock   = () => send({ t:"draw_stock" });
  const drawDiscard = () => send({ t:"draw_discard" });
  const discard     = () => {
    if (!me?.hand?.length) return;
    // şimdilik ilk kartı atıyoruz; bir sonraki adımda tıklayıp seçim ekleyeceğiz
    send({ t:"discard", card: me.hand[0] });
  };

  return (
    <div className="min-h-screen bg-green-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-2">
        Masa: {String(id)} <span className="text-sm opacity-80">| Seat: {seat}</span>
      </h1>

      {!state && <p>Bağlanıyor...</p>}

      {state && (
        <>
          <div className="mb-3 space-y-1">
            <div>Alt Kart (Joker Belirleyici): <b className="font-mono">{cardLabel(state.bottomCard)}</b></div>
            <div>Yerdeki Kart: <b className="font-mono">{state.discardTop ? cardLabel(state.discardTop) : "—"}</b></div>
            <div>Sıra: Oyuncu {state.turnSeat + 1}</div>
            <div>Faz: {state.phase}</div>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={drawStock}   className="bg-blue-600 px-3 py-2 rounded hover:bg-blue-700">Desteden Çek</button>
            <button onClick={drawDiscard} className="bg-orange-600 px-3 py-2 rounded hover:bg-orange-700">Yerden Al</button>
            <button onClick={discard}     className="bg-red-600 px-3 py-2 rounded hover:bg-red-700">At (ilk kart)</button>
          </div>

          <h2 className="text-xl font-semibold mb-2">Elin</h2>
          <div className="w-full max-w-3xl flex flex-wrap gap-2 bg-green-800 p-3 rounded">
            {me?.hand?.map((c:any)=>(
              <span key={c.id} className="bg-white text-black px-2 py-1 rounded font-bold">
                {cardLabel(c)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function cardLabel(c:any){
  const suits:any = {H:"♥", D:"♦", C:"♣", S:"♠"};
  const ranks:any = {1:"A",11:"J",12:"Q",13:"K"};
  return `${suits[c.suit]}${ranks[c.rank] ?? c.rank}`;
}