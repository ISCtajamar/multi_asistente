"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import {
  Send,
  ArrowLeft,
  Bot,
  User,
  Loader2,
  Plus,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export default function ChatPage() {
  const { id } = useParams();
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      const { data } = await api.get(
        `/api/chat/conversations/${id}/${conv.id}/messages`
      );
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

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-72 bg-surface border-r border-border flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border space-y-3">
          <Link
            href="/dashboard/assistants"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors duration-200 text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Volver al panel
          </Link>
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center gap-2 bg-accent text-white py-2.5 rounded-xl text-sm font-medium hover:bg-accent-hover transition-all duration-200 active:scale-[0.98]"
          >
            <Plus size={16} />
            Nueva conversación
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="w-8 h-8 text-text-tertiary mb-2" />
              <p className="text-xs text-text-tertiary">Sin conversaciones aún</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  currentConversation?.id === conv.id
                    ? "bg-accent-light text-accent font-medium"
                    : "hover:bg-surface-secondary text-text-secondary"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="shrink-0 opacity-60" />
                  <span className="truncate text-xs">
                    {conv.title || "Nueva conversación"}
                  </span>
                </div>
                <div className="text-[10px] opacity-50 mt-1 ml-5">
                  {new Date(conv.updated_at).toLocaleString("es-ES", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <header className="h-16 bg-surface/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-success flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Chat con Asistente
              </h2>
              <p className="text-xs text-text-tertiary">
                RAG · Aislamiento de fuentes activo
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/assistants/${id}/documents`}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors px-3 py-1.5 rounded-lg hover:bg-accent-light"
          >
            Ver documentos
          </Link>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-6"
        >
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-accent/10 to-success-light flex items-center justify-center mb-5">
                  <Sparkles className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  ¡Hola! Estoy listo para ayudarte
                </h3>
                <p className="text-sm text-text-secondary max-w-sm">
                  Hazme preguntas sobre los documentos que has subido a este asistente. Responderé basándome en su contenido.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 animate-fade-in ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.role === "user"
                      ? "bg-accent text-white"
                      : "bg-gradient-to-br from-surface-secondary to-border-light text-text-secondary"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-white rounded-tr-md"
                      : "bg-surface border border-border rounded-tl-md text-text-primary shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-[11px] font-semibold text-text-secondary mb-1.5">
                        📄 Fuentes utilizadas:
                      </p>
                      <ul className="space-y-1">
                        {msg.sources.map((s: any, idx: number) => (
                          <li
                            key={idx}
                            className="text-[11px] text-text-tertiary bg-surface-secondary rounded-lg px-2.5 py-1.5 truncate"
                          >
                            {s.content_preview}...
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-surface-secondary to-border-light text-text-secondary flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-text-tertiary typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-text-tertiary typing-dot" />
                    <div className="w-2 h-2 rounded-full bg-text-tertiary typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <footer className="border-t border-border bg-surface/80 backdrop-blur-xl p-4">
          <form
            onSubmit={sendMessage}
            className="max-w-3xl mx-auto flex items-end gap-3"
          >
            <div className="flex-1 bg-surface-secondary border border-border-light rounded-2xl px-4 py-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all duration-200">
              <textarea
                ref={inputRef}
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none leading-relaxed"
                placeholder="Pregunta algo sobre tus documentos..."
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
                style={{ maxHeight: "160px" }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-accent text-white p-3 rounded-xl hover:bg-accent-hover transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.95] shadow-sm shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="max-w-3xl mx-auto text-[10px] text-text-tertiary text-center mt-2">
            Las respuestas se basan exclusivamente en los documentos subidos a este asistente.
          </p>
        </footer>
      </div>
    </div>
  );
}
