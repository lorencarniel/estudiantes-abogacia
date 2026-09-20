"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface CaseData {
  title: string;
  facts: string;
  questions: string[];
  resolution: string;
}

interface Evaluation {
  score: number;
  correct_points: string[];
  errors: string[];
  omissions: string[];
  feedback: string;
}

type PageState = "setup" | "loading" | "case" | "evaluating" | "results";

export default function PracticalCasesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [state, setState] = useState<PageState>("setup");
  const [sourceText, setSourceText] = useState("");
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [showResolution, setShowResolution] = useState(false);
  const [error, setError] = useState("");

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  const handleGenerate = useCallback(async (text: string, syllabusId?: string) => {
    setState("loading");
    setError("");
    setSourceText(text);
    try {
      const res = await fetch("/api/ai/practical-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, syllabusId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error"); setState("setup"); return; }
      setCaseData(data);
      setState("case");
    } catch {
      setError("Error de conexión.");
      setState("setup");
    }
  }, []);

  async function handleSubmitAnalysis() {
    if (!analysis.trim() || !caseData) return;
    setState("evaluating");
    try {
      const res = await fetch("/api/ai/practical-case/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseFacts: caseData.facts,
          caseQuestions: caseData.questions,
          studentAnalysis: analysis,
          resolution: caseData.resolution,
          sourceText,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error"); setState("case"); return; }
      setEvaluation(data);
      setState("results");
    } catch {
      setError("Error de conexión.");
      setState("case");
    }
  }

  function handleReset() {
    setState("setup");
    setCaseData(null);
    setAnalysis("");
    setEvaluation(null);
    setShowResolution(false);
    setError("");
  }

  function getScoreColor(score: number): string {
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-amber-600";
    return "text-red-600";
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </Link>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">📋</span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Casos prácticos</h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        La IA genera un caso jurídico basado en tu material. Analizalo y recibí corrección automática.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {state === "setup" && (
        <div className="card">
          <MaterialInput onSubmit={handleGenerate} loading={false} buttonLabel="Generar caso práctico" />
        </div>
      )}

      {state === "loading" && (
        <div className="card text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Generando caso práctico...</p>
        </div>
      )}

      {(state === "case" || state === "evaluating") && caseData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{caseData.title}</h2>
            <button onClick={handleReset} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Nuevo caso
            </button>
          </div>

          <div className="card border-l-4 border-l-primary-500">
            <p className="text-xs font-semibold text-primary-600 uppercase mb-2">Hechos del caso</p>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{caseData.facts}</p>
          </div>

          <div className="card bg-amber-50 border-amber-200">
            <p className="text-xs font-semibold text-amber-700 uppercase mb-3">Preguntas para el análisis</p>
            <ol className="space-y-2">
              {caseData.questions.map((q, i) => (
                <li key={i} className="text-sm text-gray-800 dark:text-gray-200 flex gap-2">
                  <span className="font-bold text-amber-600 shrink-0">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ol>
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Tu análisis</p>
            <textarea
              className="input-field min-h-[200px] resize-y"
              placeholder="Escribí tu análisis del caso: identificá los hechos relevantes, la normativa aplicable y tu conclusión..."
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              disabled={state === "evaluating"}
            />
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={handleSubmitAnalysis}
                disabled={analysis.trim().length < 50 || state === "evaluating"}
                className="btn-primary"
              >
                {state === "evaluating" ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Evaluando...
                  </span>
                ) : "Enviar para corrección"}
              </button>
              <button
                onClick={() => setShowResolution(!showResolution)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showResolution ? "Ocultar" : "Ver"} resolución modelo
              </button>
            </div>
          </div>

          {showResolution && (
            <div className="card bg-green-50 border-green-200">
              <p className="text-xs font-semibold text-green-700 uppercase mb-2">Resolución modelo</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{caseData.resolution}</p>
            </div>
          )}
        </div>
      )}

      {state === "results" && evaluation && caseData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Corrección: {caseData.title}</h2>
            <button onClick={handleReset} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Nuevo caso
            </button>
          </div>

          <div className="card text-center bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-200">
            <p className={`text-5xl font-bold ${getScoreColor(evaluation.score)}`}>
              {evaluation.score}/10
            </p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Puntaje</p>
          </div>

          {evaluation.correct_points.length > 0 && (
            <div className="card border-l-4 border-l-green-500">
              <p className="text-xs font-semibold text-green-700 uppercase mb-2">Aciertos</p>
              <ul className="space-y-1">
                {evaluation.correct_points.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                    <span className="text-green-500 shrink-0">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.errors.length > 0 && (
            <div className="card border-l-4 border-l-red-500">
              <p className="text-xs font-semibold text-red-700 uppercase mb-2">Errores</p>
              <ul className="space-y-1">
                {evaluation.errors.map((e, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                    <span className="text-red-500 shrink-0">✗</span>{e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {evaluation.omissions.length > 0 && (
            <div className="card border-l-4 border-l-amber-500">
              <p className="text-xs font-semibold text-amber-700 uppercase mb-2">Omisiones</p>
              <ul className="space-y-1">
                {evaluation.omissions.map((o, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                    <span className="text-amber-500 shrink-0">!</span>{o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card bg-primary-50 border-primary-200">
            <p className="text-xs font-semibold text-primary-700 uppercase mb-2">Comentario del profesor</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{evaluation.feedback}</p>
          </div>

          <div className="card bg-green-50 border-green-200">
            <p className="text-xs font-semibold text-green-700 uppercase mb-2">Resolución modelo</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{caseData.resolution}</p>
          </div>
        </div>
      )}
    </div>
  );
}
