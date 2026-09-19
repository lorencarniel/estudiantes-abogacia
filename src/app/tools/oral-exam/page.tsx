"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface ExamQuestion {
  question: string;
  key_points: string[];
  difficulty: "fácil" | "medio" | "difícil";
}

interface AnswerEvaluation {
  score: number;
  correct_points: string[];
  missing_points: string[];
  model_answer: string;
  tip: string;
}

interface QuestionResult {
  question: ExamQuestion;
  answer: string;
  evaluation: AnswerEvaluation;
}

type PageState = "setup" | "loading" | "answering" | "evaluating" | "reviewed" | "summary";

export default function OralExamPage() {
  const { status } = useSession();
  const router = useRouter();
  const [state, setState] = useState<PageState>("setup");
  const [sourceText, setSourceText] = useState("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluation | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
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
      const res = await fetch("/api/ai/oral-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, syllabusId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error"); setState("setup"); return; }
      setQuestions(data.questions);
      setCurrentIndex(0);
      setResults([]);
      setState("answering");
    } catch {
      setError("Error de conexión.");
      setState("setup");
    }
  }, []);

  async function handleSubmitAnswer() {
    if (!answer.trim()) return;
    const q = questions[currentIndex];
    setState("evaluating");
    try {
      const res = await fetch("/api/ai/oral-exam/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          keyPoints: q.key_points,
          studentAnswer: answer,
          sourceText,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error"); setState("answering"); return; }
      setCurrentEvaluation(data);
      setState("reviewed");
    } catch {
      setError("Error de conexión.");
      setState("answering");
    }
  }

  function handleNext() {
    const q = questions[currentIndex];
    setResults([...results, { question: q, answer, evaluation: currentEvaluation! }]);
    setAnswer("");
    setCurrentEvaluation(null);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setState("answering");
    } else {
      setState("summary");
    }
  }

  function handleReset() {
    setState("setup");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswer("");
    setCurrentEvaluation(null);
    setResults([]);
    setError("");
  }

  function getDifficultyColor(d: string) {
    if (d === "fácil") return "bg-green-100 text-green-700";
    if (d === "medio") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  }

  function getScoreColor(score: number) {
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-amber-600";
    return "text-red-600";
  }

  const finalResults = state === "summary"
    ? [...results, ...(currentEvaluation ? [{ question: questions[currentIndex], answer, evaluation: currentEvaluation }] : [])]
    : results;
  const avgScore = finalResults.length > 0
    ? Math.round((finalResults.reduce((s, r) => s + r.evaluation.score, 0) / finalResults.length) * 10) / 10
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </Link>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🎤</span>
        <h1 className="text-3xl font-bold text-gray-900">Simulacro de examen oral</h1>
      </div>
      <p className="text-gray-600 mb-6">
        La IA te hace 5 preguntas de examen oral. Respondé cada una y recibí corrección inmediata.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {state === "setup" && (
        <div className="card">
          <MaterialInput onSubmit={handleGenerate} loading={false} buttonLabel="Comenzar simulacro" />
        </div>
      )}

      {state === "loading" && (
        <div className="card text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-500">Preparando preguntas de examen...</p>
        </div>
      )}

      {(state === "answering" || state === "evaluating") && questions[currentIndex] && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500">
                Pregunta {currentIndex + 1} de {questions.length}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDifficultyColor(questions[currentIndex].difficulty)}`}>
                {questions[currentIndex].difficulty}
              </span>
            </div>
            <button onClick={handleReset} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Reiniciar
            </button>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
            />
          </div>

          <div className="card border-l-4 border-l-primary-500">
            <p className="text-xs font-semibold text-primary-600 uppercase mb-2">Pregunta del tribunal</p>
            <p className="text-lg text-gray-900 font-medium leading-relaxed">
              {questions[currentIndex].question}
            </p>
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Tu respuesta</p>
            <textarea
              className="input-field min-h-[150px] resize-y"
              placeholder="Escribí tu respuesta como si estuvieras frente al tribunal..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={state === "evaluating"}
              autoFocus
            />
            <div className="mt-3">
              <button
                onClick={handleSubmitAnswer}
                disabled={answer.trim().length < 20 || state === "evaluating"}
                className="btn-primary"
              >
                {state === "evaluating" ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Evaluando...
                  </span>
                ) : "Enviar respuesta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {state === "reviewed" && currentEvaluation && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Corrección - Pregunta {currentIndex + 1} de {questions.length}
            </span>
            <button onClick={handleReset} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Reiniciar
            </button>
          </div>

          <div className="card bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Tu pregunta</p>
            <p className="text-sm text-gray-700 italic">{questions[currentIndex].question}</p>
          </div>

          <div className="card text-center bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-200">
            <p className={`text-4xl font-bold ${getScoreColor(currentEvaluation.score)}`}>
              {currentEvaluation.score}/10
            </p>
          </div>

          {currentEvaluation.correct_points.length > 0 && (
            <div className="card border-l-4 border-l-green-500">
              <p className="text-xs font-semibold text-green-700 uppercase mb-2">Puntos correctos</p>
              <ul className="space-y-1">
                {currentEvaluation.correct_points.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-green-500 shrink-0">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {currentEvaluation.missing_points.length > 0 && (
            <div className="card border-l-4 border-l-red-500">
              <p className="text-xs font-semibold text-red-700 uppercase mb-2">Puntos faltantes</p>
              <ul className="space-y-1">
                {currentEvaluation.missing_points.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-red-500 shrink-0">✗</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card bg-primary-50 border-primary-200">
            <p className="text-xs font-semibold text-primary-700 uppercase mb-2">Respuesta modelo</p>
            <p className="text-sm text-gray-800 leading-relaxed">{currentEvaluation.model_answer}</p>
          </div>

          <div className="card bg-amber-50 border-amber-200">
            <p className="text-xs font-semibold text-amber-700 uppercase mb-2">Consejo</p>
            <p className="text-sm text-gray-800">{currentEvaluation.tip}</p>
          </div>

          <div className="text-center">
            <button onClick={handleNext} className="btn-primary px-8">
              {currentIndex + 1 < questions.length ? "Siguiente pregunta" : "Ver resumen final"}
            </button>
          </div>
        </div>
      )}

      {state === "summary" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Resumen del examen</h2>
            <button onClick={handleReset} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Nuevo simulacro
            </button>
          </div>

          <div className="card text-center bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-200">
            <p className={`text-5xl font-bold ${getScoreColor(avgScore)}`}>
              {avgScore}/10
            </p>
            <p className="text-gray-500 mt-1">Promedio general</p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {finalResults.map((r, i) => (
              <div key={i} className="card text-center py-3">
                <p className="text-xs text-gray-500 mb-1">P{i + 1}</p>
                <p className={`text-xl font-bold ${getScoreColor(r.evaluation.score)}`}>
                  {r.evaluation.score}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {finalResults.map((r, i) => (
              <details key={i} className="card group">
                <summary className="cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${getScoreColor(r.evaluation.score)}`}>
                      {r.evaluation.score}/10
                    </span>
                    <span className="text-sm text-gray-700 line-clamp-1">{r.question.question}</span>
                  </div>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">&#9660;</span>
                </summary>
                <div className="mt-4 space-y-3 border-t pt-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Tu respuesta</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{r.answer}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary-600 uppercase mb-1">Respuesta modelo</p>
                    <p className="text-sm text-gray-700">{r.evaluation.model_answer}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Consejo</p>
                    <p className="text-sm text-gray-700">{r.evaluation.tip}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
