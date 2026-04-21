"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Upload, File, Trash2, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function DocumentsPage() {
  const { id } = useParams();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000); // Poll for status updates
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
    if (!confirm("¿Eliminar este documento? Se borrarán todos sus chunks vectorizados.")) return;
    try {
      await api.delete(`/api/documents/${id}/${docId}`);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        href="/dashboard/assistants"
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft size={20} />
        Volver al listado
      </Link>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Documentos del Asistente</h1>
        <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
          {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
          {uploading ? "Subiendo..." : "Subir Documento"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-6 py-3 text-sm font-semibold text-gray-600 uppercase"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <File size={20} className="text-blue-500" />
                    <span className="font-medium">{doc.filename}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {doc.status === "ready" && (
                    <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                      <CheckCircle2 size={16} />
                      Listo
                    </div>
                  )}
                  {doc.status === "processing" && (
                    <div className="flex items-center gap-1.5 text-blue-600 text-sm font-medium">
                      <Loader2 className="animate-spin" size={16} />
                      Procesando...
                    </div>
                  )}
                  {doc.status === "error" && (
                    <div className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                      <AlertCircle size={16} />
                      Error
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(doc.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && documents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay documentos subidos para este asistente.
          </div>
        )}
      </div>
    </div>
  );
}
