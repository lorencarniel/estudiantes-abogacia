"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface DebateMessage {
  role: "user" | "ai";
  content: string;
  strengths?: string[];
  weaknesses?: string[];
}

interface DebateStart {
  topic: string;
  ai_position: string;
  opening_argument: string;
  instructions: string;
}

interface DebateResponse {
  counter_argument: string;
  strengths: string[];
  weaknesses: string[];
  is_final: boolean;
  final_score: number;
  final_feedback: string;
}

type PageState = "setup" | "loading" | "debating" | "responding" | "finished";

export default function DebatePage() {
  const { status } = useSession();
  const router = useRouter();
  const [state, setState] = useState<PageState>("setup");
  const [sourceText, setSourceText] = useState("");
  const [topic, setTopic] = useState("");
  const [aiPosition, setAiPosition] = useState("");
  const [instructions, setInstructions] = useState("");
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [argument, setArgument] = useState("");
  const [roundNumber, setRoundNumber] = useState(1);
  const [error, setError] = useState("");
  const [finalScore, setFinalScore] = useState(0);
  const [finalFeedback, setFinalFeedback] = useState("");

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  const handleGenerate = useCallback(async (text: string) => {
    setState("loading");
    setError("");
    setSourceText(text);
    try {
      const res = await fetch("/api/ai/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error");
        setState("setup");
        return;
      }
      const d = data as DebateStart;
      setTopic(d.topic);
      setAiPosition(d.ai_position);
      setInstructions(d.instructions);
      setMessages([{ role: "ai", content: d.opening_argument }]);
      setRoundNumber(1);
      setState("debating");
    } catch {
      setError("Error de conexion.");
      setState("setup");
    }
  }, []);

  async function handleSubmitArgument() {
    if (argument.trim().length < 50) return;
    const studentArg = argument.trim();
    const newMessages: DebateMessage[] = [
      ...messages,
      { role: "user", content: studentArg },
    ];
    setMessages(newMessages);
    setArgument("");
    setState("responding");

    try {
      const res = await fetch("/api/ai/debate/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          topic,
          aiPosition,
          history: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          studentArgument: studentArg,
        }),
      });
      const data = (await res.json()) as DebateResponse;
      if (!res.ok) {
        setError((data as unknown as { error: string }).error || "Error");
        setState("debating");
        return;
      }

      const aiMsg: DebateMessage = {
        role: "ai",
        content: data.counter_argument,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
      };

      setMessages([...newMessages, aiMsg]);
      setRoundNumber((r) => r + 1);

      if (data.is_final) {
        setFinalScore(data.final_score);
        setFinalFeedback(data.final_feedback);
        setState("finished");
      } else {
        setState("debating");
      }
    } catch {
      setError("Error de conexion.");
      setState("debating");
    }
  }

  function handleReset() {
    setState("setup");
    setSourceText("");
    setTopic("");
    setAiPosition("");
    setInstructions("");
    setMessages([]);
    setArgument("");
    setRoundNumber(1);
    setError("");
    setFinalScore(0);
    setFinalFeedback("");
  }

  function getScoreColor(score: number) {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 5) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }

  const maxRounds = 4;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/dashboard"
        className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm mb-4 inline-block"
      >
        &larr; Volver al dashboard
      </Link>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">&#9878;&#65039;</span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Debate con la IA
        </h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        La IA toma la postura contraria sobre un tema de tu material. Argumenta
        en contra y recibí una evaluación final.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {state === "setup" && (
        <div className="card">
          <MaterialInput
            onSubmit={handleGenerate}
            loading={false}
            buttonLabel="Iniciar debate"
          />
        </div>
      )}

      {state === "loading" && (
        <div className="card text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Analizando el material y preparando el debate...
          </p>
        </div>
      )}

      {(state === "debating" || state === "responding") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Ronda {roundNumber} de {maxRounds}
            </span>
            <button
              onClick={handleReset}
              className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              Reiniciar
            </button>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((roundNumber - 1) / maxRounds) * 100}%`,
              }}
            />
          </div>

          <div className="card bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase mb-1">
              Tema del debate
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {topic}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Postura de la IA: {aiPosition}
            </p>
          </div>

          {instructions && roundNumber === 1 && (
            <div className="card bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase mb-1">
                Tu objetivo
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {instructions}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i}>
                <div
                  className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "ai"
                        ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-sm"
                        : "bg-primary-600 dark:bg-primary-700 text-white rounded-tr-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {msg.role === "ai" ? (
                          <span className="text-indigo-600 dark:text-indigo-400">
                            &#9878;&#65039; Abogado del diablo
                          </span>
                        ) : (
                          <span
                            className={
                              msg.role === "user"
                                ? "text-primary-100"
                                : "text-gray-500 dark:text-gray-400"
                            }
                          >
                            Tu argumento
                          </span>
                        )}
                      </span>
                    </div>
                    <p
                      className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "ai"
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-white"
                      }`}
                    >
                      {msg.content}
                    </p>
                  </div>
                </div>
                {msg.role === "ai" && msg.strengths && msg.strengths.length > 0 && (
                  <div className="ml-4 mt-2 space-y-2">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 max-w-[85%]">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">
                        Puntos fuertes de tu argumento
                      </p>
                      <ul className="space-y-0.5">
                        {msg.strengths.map((s, j) => (
                          <li
                            key={j}
                            className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5"
                          >
                            <span className="text-green-500 shrink-0">
                              &#10003;
                            </span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {msg.weaknesses && msg.weaknesses.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 max-w-[85%]">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase mb-1">
                          Puntos debiles
                        </p>
                        <ul className="space-y-0.5">
                          {msg.weaknesses.map((w, j) => (
                            <li
                              key={j}
                              className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5"
                            >
                              <span className="text-red-500 shrink-0">
                                &#10007;
                              </span>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {state === "responding" && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Preparando contra-argumento...
                  </span>
                </div>
              </div>
            </div>
          )}

          {state === "debating" && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
                Tu argumento (ronda {roundNumber})
              </p>
              <textarea
                className="input-field min-h-[120px] resize-y"
                placeholder="Escribi tu contra-argumento... (minimo 50 caracteres)"
                value={argument}
                onChange={(e) => setArgument(e.target.value)}
                autoFocus
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {argument.length} caracteres (min. 50)
                </span>
                <button
                  onClick={handleSubmitArgument}
                  disabled={argument.trim().length < 50}
                  className="btn-primary"
                >
                  Enviar argumento
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {state === "finished" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Resultado del debate
            </h2>
            <button
              onClick={handleReset}
              className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              Nuevo debate
            </button>
          </div>

          <div className="card text-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-2">
              Puntaje final
            </p>
            <p className={`text-5xl font-bold ${getScoreColor(finalScore)}`}>
              {finalScore}/10
            </p>
          </div>

          {finalFeedback && (
            <div className="card bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase mb-2">
                Evaluacion del profesor
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {finalFeedback}
              </p>
            </div>
          )}

          <div className="card">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-3">
              Tema: {topic}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Postura de la IA: {aiPosition}
            </p>

            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div
                    className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "ai"
                          ? "bg-gray-100 dark:bg-gray-800 rounded-tl-sm"
                          : "bg-primary-100 dark:bg-primary-900/30 rounded-tr-sm"
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1">
                        {msg.role === "ai" ? (
                          <span className="text-indigo-600 dark:text-indigo-400">
                            &#9878;&#65039; Abogado del diablo
                          </span>
                        ) : (
                          <span className="text-primary-700 dark:text-primary-400">
                            Tu argumento
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                  {msg.role === "ai" &&
                    msg.strengths &&
                    msg.strengths.length > 0 && (
                      <div className="ml-4 mt-2 flex flex-wrap gap-2">
                        {msg.strengths.map((s, j) => (
                          <span
                            key={`s-${j}`}
                            className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full"
                          >
                            &#10003; {s}
                          </span>
                        ))}
                        {msg.weaknesses?.map((w, j) => (
                          <span
                            key={`w-${j}`}
                            className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full"
                          >
                            &#10007; {w}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button onClick={handleReset} className="btn-primary px-8">
              Nuevo debate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
