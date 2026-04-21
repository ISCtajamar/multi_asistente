"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { PlusCircle, MessageSquare, FileText, Trash2, Edit } from "lucide-react";

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    try {
      const { data } = await api.get("/api/assistants/");
      setAssistants(data);
    } catch (error) {
      console.error("Error fetching assistants:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAssistant = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este asistente?")) return;
    try {
      await api.delete(`/api/assistants/${id}`);
      setAssistants(assistants.filter((a) => a.id !== id));
    } catch (error) {
      console.error("Error deleting assistant:", error);
    }
  };

  if (loading) return <div className="p-8">Cargando asistentes...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Mis Asistentes</h1>
        <Link
          href="/dashboard/assistants/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <PlusCircle size={20} />
          Nuevo Asistente
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assistants.map((assistant) => (
          <div
            key={assistant.id}
            className="border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition"
          >
            <h2 className="text-xl font-semibold mb-2">{assistant.name}</h2>
            <p className="text-gray-600 mb-6 line-clamp-2">
              {assistant.description || "Sin descripción"}
            </p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <Link
                href={`/dashboard/assistants/${assistant.id}/chat`}
                className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-md hover:bg-green-200 transition text-sm"
              >
                <MessageSquare size={16} />
                Chat
              </Link>
              <Link
                href={`/dashboard/assistants/${assistant.id}/documents`}
                className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition text-sm"
              >
                <FileText size={16} />
                Docs
              </Link>
              <Link
                href={`/dashboard/assistants/${assistant.id}`}
                className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 transition text-sm"
              >
                <Edit size={16} />
                Editar
              </Link>
              <button
                onClick={() => deleteAssistant(assistant.id)}
                className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-200 transition text-sm ml-auto"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {assistants.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed">
          <p className="text-gray-500 mb-4">No tienes asistentes creados aún.</p>
          <Link
            href="/dashboard/assistants/new"
            className="text-blue-600 font-semibold hover:underline"
          >
            Crea tu primer asistente ahora
          </Link>
        </div>
      )}
    </div>
  );
}
