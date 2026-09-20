"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const { status } = useSession();
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  function handleStartChat(text: string) {
    setSourceText(text);
    setChatStarted(true);
    setMessages([{
      role: "assistant",
      content: "¡Hola! Leí tu apunte. Preguntame lo que necesites sobre el material y te ayudo a entenderlo.",
    }]);
  }

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages([...newMessages, { role: "assistant", content: data.error || "Error al responder." }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Error de conexión. Intentá de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, sourceText]);

  function handleReset() {
    setChatStarted(false);
    setSourceText("");
    setMessages([]);
    setInput("");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </Link>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">💬</span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chat con el apunte</h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Subí tu material y hacé preguntas libres. La IA responde basándose exclusivamente en tu apunte.
      </p>

      {!chatStarted && (
        <div className="card">
          <MaterialInput onSubmit={handleStartChat} loading={false} buttonLabel="Iniciar chat" showSyllabus={false} />
        </div>
      )}

      {chatStarted && (
        <div className="card p-0 overflow-hidden">
          <div className="bg-primary-50 border-b border-primary-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-primary-800">Chat activo</span>
              <span className="text-xs text-primary-500">({sourceText.length.toLocaleString()} caracteres cargados)</span>
            </div>
            <button onClick={handleReset} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
              Nuevo chat
            </button>
          </div>

          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary-600 text-white rounded-br-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="Escribí tu pregunta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={loading}
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="btn-primary px-6 shrink-0"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
