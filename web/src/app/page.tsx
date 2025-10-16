"use client";
import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [room, setRoom] = useState("deneme");

  return (
    <div className="h-screen bg-green-800 flex flex-col items-center justify-center text-white gap-4">
      <h1 className="text-3xl font-bold">KÜNT Online</h1>
      <input
        value={room}
        onChange={(e)=>setRoom(e.target.value)}
        className="text-black px-3 py-2 rounded"
        placeholder="Oda adı (ör. deneme)"
      />
      <Link
        href={`/game/${room}`}
        className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
      >
        Masaya Katıl
      </Link>
    </div>
  );
}