"use client";
import { useParams } from "next/navigation";

export default function GamePage() {
  const { id } = useParams();
  return (
    <div className="min-h-screen bg-green-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-2">Masa: {String(id)}</h1>
      <p className="opacity-80">Bir sonraki adımda buraya WS bağlantısı ve masa arayüzü gelecek.</p>
    </div>
  );
}