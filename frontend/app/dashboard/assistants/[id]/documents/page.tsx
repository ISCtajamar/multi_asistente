"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import {
  Upload,
  FileText,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  File,
  FileType2,
} from "lucide-react";
import Link from "next/link";

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText size={20} className="text-red-400" />,
  docx: <FileType2 size={20} className="text-blue-400" />,
  pptx: <FileType2 size={20} className="text-orange-400" />,
  txt: <File size={20} className="text-text-tertiary" />,
  md: <File size={20} className="text-text-tertiary" />,
};

export default function DocumentsPage() {
  const { id } = useParams();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get(`/api/documents/${id}`);
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      await api.post(`/api/documents/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      fetchDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Error al subir el documento");
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("¿Eliminar este documento? Se borrarán todos sus chunks vectorizados."))
      return;
    try {
      await api.delete(`/api/documents/${id}/${docId}`);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-light text-success text-xs font-medium">
            <CheckCircle2 size={13} />
            Listo
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-light text-accent text-xs font-medium">
            <Loader2 className="animate-spin" size={13} />
            Procesando
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-light text-danger text-xs font-medium">
            <AlertCircle size={13} />
            Error
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/dashboard/assistants"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors duration-200 text-sm font-medium"
          >
            <ArrowLeft size={18} />
            Volver
          </Link>
          <label className="cursor-pointer flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-accent-hover transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]">
            {uploading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Upload size={18} />
            )}
            {uploading ? "Subiendo..." : "Subir Documento"}
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/10 to-success-light flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              Documentos
            </h1>
            <p className="text-sm text-text-secondary">
              {documents.length} documento{documents.length !== 1 ? "s" : ""} subido{documents.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Source Isolation Banner */}
        <div className="flex items-center gap-3 bg-accent-light border border-accent/10 rounded-2xl px-5 py-4 mb-6">
          <Shield className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-medium text-accent">Aislamiento de Fuentes Activo</p>
            <p className="text-xs text-accent/70 mt-0.5">
              Los documentos de este asistente están aislados. Solo se usarán como contexto para este asistente.
            </p>
          </div>
        </div>

        {/* Documents List */}
        {!loading && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-text-tertiary" />
            </div>
            <h3 className="text-base font-medium text-text-primary mb-1">
              Sin documentos
            </h3>
            <p className="text-sm text-text-secondary max-w-xs">
              Sube PDFs, DOCX, PPTX o archivos de texto para alimentar a tu asistente.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                className="animate-fade-in group bg-surface rounded-2xl border border-border px-5 py-4 flex items-center gap-4 hover:border-accent/20 hover:shadow-sm transition-all duration-200"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-surface-secondary flex items-center justify-center shrink-0">
                  {FILE_ICONS[doc.file_type] || <File size={20} className="text-text-tertiary" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {new Date(doc.created_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Status */}
                {getStatusBadge(doc.status)}

                {/* Delete */}
                <button
                  onClick={() => deleteDocument(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-text-tertiary hover:text-danger hover:bg-danger-light transition-all duration-200"
                  title="Eliminar documento"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
