"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-800">Multi-Asistente RAG</h1>
          <p className="text-gray-500">Servidor listo. Pulsa abajo para entrar:</p>
        </div>
        
        <Link 
          href="/dashboard/assistants"
          className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105"
        >
          Entrar al Panel de Control
        </Link>
      </div>
    </div>
  );
}
