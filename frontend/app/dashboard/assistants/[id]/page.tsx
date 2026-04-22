"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { Save, ArrowLeft, Bot, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditAssistantPage() {
  const router = useRouter();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    instructions: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAssistant();
  }, [id]);

  const fetchAssistant = async () => {
    try {
      const { data } = await api.get(`/api/assistants/${id}`);
      setFormData({
        name: data.name,
        description: data.description || "",
        instructions: data.instructions || "",
      });
    } catch (error) {
      console.error("Error fetching assistant:", error);
      alert("Error al cargar el asistente");
      router.push("/dashboard/assistants");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/api/assistants/${id}`, formData);
      router.push("/dashboard/assistants");
    } catch (error) {
      console.error("Error updating assistant:", error);
      alert("Error al actualizar el asistente");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center">
          <Link
            href="/dashboard/assistants"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors duration-200 text-sm font-medium"
          >
            <ArrowLeft size={18} />
            Volver
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/10 to-success-light flex items-center justify-center">
            <Bot className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              Editar Asistente
            </h1>
            <p className="text-sm text-text-secondary">
              Modifica la configuración de {formData.name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-6 space-y-5 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Nombre del asistente
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-surface-secondary border border-border-light rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
                placeholder="Ej: Asistente Legal"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Descripción
                <span className="text-text-tertiary font-normal ml-1">(opcional)</span>
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-surface-secondary border border-border-light rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
                placeholder="Para qué sirve este asistente..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Instrucciones / System Prompt
              </label>
              <textarea
                required
                rows={8}
                className="w-full px-4 py-3 bg-surface-secondary border border-border-light rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200 resize-none leading-relaxed"
                placeholder="Define cómo debe comportarse el asistente..."
                value={formData.instructions}
                onChange={(e) =>
                  setFormData({ ...formData, instructions: e.target.value })
                }
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-accent text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.99]"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Save size={18} />
                Guardar Cambios
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
