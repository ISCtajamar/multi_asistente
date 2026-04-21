"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Send, ArrowLeft, Bot, User, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ChatPage() {
  const { id } = useParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get(`/api/chat/conversations/${id}`);
      setConversations(data);
      if (data.length > 0) {
        selectConversation(data[0]);
      } else {
        createNewConversation();
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const createNewConversation = async () => {
    try {
      const { data } = await api.post(`/api/chat/conversations/${id}`);
      setConversations([data, ...conversations]);
      selectConversation(data);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const selectConversation = async (conv: any) => {
    setCurrentConversation(conv);
    try {
      const { data } = await api.get(`/api/chat/conversations/${id}/${conv.id}/messages`);
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentConversation || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages([...messages, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post(
        `/api/chat/conversations/${id}/${currentConversation.id}/messages`,
        { content: input }
      );
      setMessages([...messages, userMsg, data]);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error al enviar el mensaje");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Conversaciones */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <Link
            href="/dashboard/assistants"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition text-sm"
          >
            <ArrowLeft size={16} />
            Volver al panel
          </Link>
          <button
            onClick={createNewConversation}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Nueva conversación
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                currentConversation?.id === conv.id
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
            >
              <div className="truncate">{conv.title || "Nueva conversación"}</div>
              <div className="text-[10px] opacity-60">
                {new Date(conv.updated_at).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center px-6">
          <h2 className="font-bold text-lg">Chat con Asistente</h2>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-white border rounded-tl-none text-gray-800"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] opacity-70">
                    <p className="font-semibold mb-1">Fuentes utilizadas:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {msg.sources.map((s: any, idx: number) => (
                        <li key={idx} className="truncate">
                           {s.content_preview}...
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div className="bg-white border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                <Loader2 className="animate-spin text-gray-400" size={18} />
              </div>
            </div>
          )}
        </div>

        <footer className="p-6 bg-white border-t">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-4">
            <input
              type="text"
              className="flex-1 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
              placeholder="Pregunta algo sobre tus documentos..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
