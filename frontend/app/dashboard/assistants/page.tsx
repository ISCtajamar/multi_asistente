"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import {
  PlusCircle,
  MessageSquare,
  FileText,
  Trash2,
  Settings,
  Bot,
  Sparkles,
  ChevronRight,
} from "lucide-react";

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

  const deleteAssistant = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isConfirmed = window.confirm("¿Estás seguro de eliminar este asistente de forma permanente?");
    if (!isConfirmed) return;

    try {
      await api.delete(`/api/assistants/${id}`);
      setAssistants(assistants.filter((a) => a.id !== id));
      alert("Asistente eliminado correctamente.");
    } catch (error: any) {
      console.error("Error deleting assistant:", error);
      alert("Error al eliminar: " + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent animate-pulse" />
          </div>
          <p className="text-text-secondary text-sm font-medium">Cargando asistentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">
                Mis Asistentes
              </h1>
              <p className="text-xs text-text-tertiary -mt-0.5">
                {assistants.length} asistente{assistants.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/assistants/new"
            className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent-hover transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <PlusCircle size={18} />
            Nuevo Asistente
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {assistants.length === 0 ? (
          <div className="animate-fade-in flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-accent-light flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              No tienes asistentes aún
            </h2>
            <p className="text-text-secondary text-sm max-w-sm mb-8">
              Crea tu primer asistente RAG, sube documentos y empieza a hacer preguntas sobre ellos.
            </p>
            <Link
              href="/dashboard/assistants/new"
              className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-accent-hover transition-all duration-200 shadow-sm"
            >
              <PlusCircle size={18} />
              Crear primer asistente
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assistants.map((assistant, index) => (
              <div
                key={assistant.id}
                className="animate-fade-in group bg-surface rounded-2xl border border-border p-5 hover:shadow-lg hover:border-accent/20 transition-all duration-300"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/10 to-success-light flex items-center justify-center">
                    <Bot className="w-5 h-5 text-accent" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => deleteAssistant(e, assistant.id)}
                    className="relative z-10 cursor-pointer opacity-40 group-hover:opacity-100 p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger-light transition-all duration-200"
                    title="Eliminar asistente"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Card Body */}
                <h2 className="text-base font-semibold text-text-primary mb-1 tracking-tight">
                  {assistant.name}
                </h2>
                <p className="text-sm text-text-secondary line-clamp-2 mb-5 leading-relaxed">
                  {assistant.description || "Sin descripción"}
                </p>

                {/* Card Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/assistants/${assistant.id}/chat`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-accent text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-accent-hover transition-all duration-200 active:scale-[0.97]"
                  >
                    <MessageSquare size={14} />
                    Chat
                  </Link>
                  <Link
                    href={`/dashboard/assistants/${assistant.id}/documents`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-surface-secondary text-text-secondary px-3 py-2 rounded-xl text-xs font-medium hover:bg-surface-hover transition-all duration-200 active:scale-[0.97]"
                  >
                    <FileText size={14} />
                    Docs
                  </Link>
                  <Link
                    href={`/dashboard/assistants/${assistant.id}`}
                    className="p-2 rounded-xl text-text-tertiary bg-surface-secondary hover:bg-surface-hover transition-all duration-200 active:scale-[0.97]"
                    title="Editar"
                  >
                    <Settings size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
