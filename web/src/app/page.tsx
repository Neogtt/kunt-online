"use client";
import Link from "next/link";
import { useState } from "react";

const defaultRoom = "deneme";
const seats = [
  { value: 0, label: "1. Oyuncu" },
  { value: 1, label: "2. Oyuncu" },
  { value: 2, label: "3. Oyuncu" },
  { value: 3, label: "4. Oyuncu" },
];

export default function Home() {
  const [room, setRoom] = useState(defaultRoom);
  const [seat, setSeat] = useState<number>(0);

  return (
    <div className="min-h-screen bg-green-800 flex flex-col items-center justify-center text-white gap-4 p-6">
      <h1 className="text-3xl font-bold">KÜNT Online</h1>
      <div className="flex flex-col gap-3 bg-green-900/60 rounded-lg p-6 w-full max-w-md">
        <label className="flex flex-col gap-2 text-sm">
          <span className="uppercase tracking-wide text-xs font-semibold text-white/70">
            Oda Adı
          </span>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="text-black px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Oda adı (ör. deneme)"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="uppercase tracking-wide text-xs font-semibold text-white/70">
            Koltuk Seçimi
          </span>
          <select
            value={seat}
            onChange={(e) => setSeat(Number(e.target.value))}
            className="text-black px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {seats.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <Link
          href={`/game/${encodeURIComponent(room)}?seat=${seat}`}
          className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600 text-center font-semibold transition"
        >
          Masaya Katıl
        </Link>
      </div>  
    </div>
  );
}
