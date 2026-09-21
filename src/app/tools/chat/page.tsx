"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface NotebookOption {
  id: string;
  name: string;
  color: string;
  materialCount: number;
}

export default function ChatPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sourceText, setSourceText] = useState("");
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notebookId, setNotebookId] = useState<string | null>(null);
  const [notebookName, setNotebookName] = useState("");
  const [notebooks, setNotebooks] = useState<NotebookOption[]>([]);
  const [inputMode, setInputMode] = useState<"text" | "notebook">("text");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/notebooks")
        .then((r) => r.json())
        .then((data) => {
          if (data.notebooks) {
            setNotebooks(data.notebooks.filter((n: NotebookOption) => n.materialCount > 0));
          }
        })
        .catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    const nbId = searchParams.get("notebook");
    if (nbId && status === "authenticated" && !chatStarted) {
      startFromNotebook(nbId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, status]);

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  async function startFromNotebook(id: string) {
    try {
      const res = await fetch(`/api/notebooks/${id}`);
      const data = await res.json();
      if (data.notebook && data.notebook.materials.length > 0) {
        setNotebookId(id);
        setNotebookName(data.notebook.name);
        const totalChars = data.notebook.materials.reduce(
          (acc: number, m: { charCount: number }) => acc + m.charCount, 0
        );
        setSourceText(`[Cuaderno: ${data.notebook.name} — ${data.notebook.materials.length} apuntes, ${totalChars.toLocaleString()} chars]`);
        setChatStarted(true);
        setMessages([{
          role: "assistant",
          content: `¡Hola! Cargué todos los apuntes de "${data.notebook.name}" (${data.notebook.materials.length} apuntes). Preguntame lo que necesites sobre el material.`,
        }]);
      }
    } catch {}
  }

  function handleStartChat(text: string) {
    setSourceText(text);
    setNotebookId(null);
    setNotebookName("");
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
      const body: Record<string, unknown> = { messages: newMessages };
      if (notebookId) {
        body.notebookId = notebookId;
      } else {
        body.text = sourceText;
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }, [input, loading, messages, sourceText, notebookId]);

  function handleReset() {
    setChatStarted(false);
    setSourceText("");
    setMessages([]);
    setInput("");
    setNotebookId(null);
    setNotebookName("");
    setInputMode("text");
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
        Subí tu material o seleccioná un cuaderno y hacé preguntas libres. La IA responde basándose exclusivamente en tu apunte.
      </p>

      {!chatStarted && (
        <div className="space-y-4">
          {notebooks.length > 0 && (
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-2">
              <button
                type="button"
                onClick={() => setInputMode("text")}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  inputMode === "text"
                    ? "border-primary-600 text-primary-700 dark:text-primary-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                Texto / Archivo
              </button>
              <button
                type="button"
                onClick={() => setInputMode("notebook")}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  inputMode === "notebook"
                    ? "border-primary-600 text-primary-700 dark:text-primary-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
              >
                📓 Mis cuadernos
              </button>
            </div>
          )}

          {inputMode === "text" && (
            <div className="card">
              <MaterialInput onSubmit={handleStartChat} loading={false} buttonLabel="Iniciar chat" showSyllabus={false} />
            </div>
          )}

          {inputMode === "notebook" && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Seleccioná un cuaderno para chatear
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {notebooks.map((nb) => (
                  <button
                    key={nb.id}
                    type="button"
                    onClick={() => startFromNotebook(nb.id)}
                    className="text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                    style={{ borderLeftColor: nb.color, borderLeftWidth: 4 }}
                  >
                    <p className="font-bold text-gray-900 dark:text-white">{nb.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {nb.materialCount} apunte{nb.materialCount !== 1 ? "s" : ""}
                    </p>
                  </button>
                ))}
              </div>
              <Link href="/tools/notebooks" className="inline-block mt-3 text-sm text-primary-600 hover:text-primary-800 font-medium">
                Gestionar cuadernos &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {chatStarted && (
        <div className="card p-0 overflow-hidden">
          <div className="bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm font-medium text-primary-800 dark:text-primary-300">
                {notebookId ? `📓 ${notebookName}` : "Chat activo"}
              </span>
              {!notebookId && (
                <span className="text-xs text-primary-500 dark:text-primary-400">
                  ({sourceText.length.toLocaleString()} caracteres cargados)
                </span>
              )}
            </div>
            <button onClick={handleReset} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 font-medium">
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
