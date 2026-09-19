"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import MaterialInput from "@/components/MaterialInput";
import { useAutoLoadMaterial } from "@/hooks/useAutoLoadMaterial";

type Difficulty = "facil" | "media" | "dificil";

interface Question {
  number: number;
  statement: string;
  options: string[];
}

interface GradeResult {
  number: number;
  statement: string;
  options: string[];
  selected: number | null;
  correct_index: number;
  correct: boolean;
  explanation: string;
}

interface QuizData {
  quizId: string;
  difficulty: Difficulty;
  questions: Question[];
}

interface GradeData {
  score: number;
  total: number;
  passed: boolean;
  results: GradeResult[];
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facil: "Fácil - conceptos básicos (15 min)",
  media: "Media - aplicación (20 min)",
  dificil: "Difícil - casos para analizar (25 min)",
};

const EXAM_MINUTES: Record<Difficulty, number> = {
  facil: 15,
  media: 20,
  dificil: 25,
};

export default function QuizzesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("media");
  const [examType, setExamType] = useState<"parcial" | "final" | "libre">("parcial");
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [results, setResults] = useState<GradeData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const { text: autoText, loading: autoLoading, subjectName } = useAutoLoadMaterial();
  const autoTriggered = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (autoText && !autoTriggered.current && !loading && !quiz) {
      autoTriggered.current = true;
      handleGenerate(autoText);
    }
  }, [autoText]);

  useEffect(() => {
    if (!quiz || results) return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, results, timeLeft]);

  async function handleGenerate(text: string, syllabusId?: string) {
    setLoading(true);
    setError("");
    setQuiz(null);
    setResults(null);

    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, difficulty, examType, syllabusId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuiz(data);
      setAnswers(new Array(10).fill(null));
      setTimeLeft(EXAM_MINUTES[difficulty] * 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar");
    } finally {
      setLoading(false);
    }
  }

  async function handleGrade() {
    if (!quiz) return;
    setGrading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/quiz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.quizId, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al corregir");
    } finally {
      setGrading(false);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function handleNewQuiz() {
    setQuiz(null);
    setResults(null);
    setAnswers([]);
    setTimeLeft(0);
    setError("");
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-primary-600 hover:underline text-sm">
          &larr; Volver al dashboard
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <span className="text-3xl">📝</span> Cuestionarios
        </h1>
        <p className="text-gray-600 mt-2">
          Simulacro de examen con 10 preguntas de opción múltiple, corrección automática y explicaciones.
        </p>
      </div>

      {(autoLoading || (autoText && loading && !quiz)) && (
        <div className="card text-center py-12 mb-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            Cargando apunte de {subjectName}...
          </p>
        </div>
      )}

      {!quiz && !autoLoading && !(autoText && loading && !quiz) && (
        <div className="card mb-8">
          <MaterialInput
            onSubmit={handleGenerate}
            loading={loading}
            buttonLabel="Generar cuestionario"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Dificultad
                </label>
                <select
                  id="difficulty"
                  className="input-field"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  disabled={loading}
                >
                  {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="examType" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de examen
                </label>
                <select
                  id="examType"
                  className="input-field"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as "parcial" | "final" | "libre")}
                  disabled={loading}
                >
                  <option value="parcial">Parcial - temas puntuales</option>
                  <option value="final">Final - integrador</option>
                  <option value="libre">Libre - dificultad maxima</option>
                </select>
              </div>
            </div>
          </MaterialInput>
        </div>
      )}

      {error && (
        <div className="card border-red-200 bg-red-50 mb-8">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {quiz && !results && (
        <div className="card">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Simulacro</h2>
              <p className="text-sm text-gray-500">
                {DIFFICULTY_LABELS[quiz.difficulty]} &middot; {quiz.questions.length} preguntas
              </p>
            </div>
            <div className={`text-2xl font-mono font-bold ${timeLeft < 60 ? "text-red-600" : timeLeft < 180 ? "text-amber-600" : "text-gray-700"}`}>
              {formatTime(timeLeft)}
            </div>
          </div>

          <div className="space-y-8">
            {quiz.questions.map((q, qi) => (
              <div key={qi}>
                <p className="font-medium text-gray-900 mb-3">
                  <span className="text-primary-600 font-bold">{q.number}.</span>{" "}
                  {q.statement}
                </p>
                <div className="space-y-2 ml-4">
                  {q.options.map((option, oi) => (
                    <label
                      key={oi}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        answers[qi] === oi
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        checked={answers[qi] === oi}
                        onChange={() => {
                          const next = [...answers];
                          next[qi] = oi;
                          setAnswers(next);
                        }}
                        className="mt-0.5"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {answers.filter((a) => a !== null).length} de {quiz.questions.length} respondidas
            </p>
            <button
              onClick={handleGrade}
              className="btn-primary"
              disabled={grading}
            >
              {grading ? "Corrigiendo..." : "Entregar examen"}
            </button>
          </div>
        </div>
      )}

      {results && (
        <div>
          <div className={`card mb-6 ${results.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <div className="text-center">
              <p className="text-5xl font-bold mb-2">
                {results.score}/{results.total}
              </p>
              <p className={`text-lg font-semibold ${results.passed ? "text-green-700" : "text-red-700"}`}>
                {results.passed ? "Aprobado" : "No aprobado"}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Se necesitan 7 respuestas correctas para aprobar
              </p>
            </div>
          </div>

          <div className="card mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Corrección detallada</h3>
            <div className="space-y-6">
              {results.results.map((r) => (
                <div key={r.number} className={`p-4 rounded-lg border ${r.correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                  <p className="font-medium text-gray-900 mb-2">
                    <span className={`font-bold ${r.correct ? "text-green-600" : "text-red-600"}`}>
                      {r.number}. {r.correct ? "Correcto" : "Incorrecto"}
                    </span>
                    {" "}{r.statement}
                  </p>
                  <div className="space-y-1 ml-4 text-sm">
                    {r.options.map((opt, oi) => (
                      <p
                        key={oi}
                        className={`${
                          oi === r.correct_index
                            ? "text-green-800 font-semibold"
                            : oi === r.selected && !r.correct
                            ? "text-red-700 line-through"
                            : "text-gray-600"
                        }`}
                      >
                        {oi === r.correct_index ? "✓" : oi === r.selected && !r.correct ? "✗" : "  "}{" "}
                        {opt}
                      </p>
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm mt-2 italic border-l-2 border-primary-300 pl-3">
                    {r.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button onClick={handleNewQuiz} className="btn-primary">
              Nuevo cuestionario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
