"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface Question {
  statement: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface GameData {
  id: string;
  gameType: string;
  title: string;
  questions: Question[];
  total: number;
}

interface GameRecord {
  id: string;
  gameType: string;
  title: string;
  score: number | null;
  total: number;
  streak: number;
  completedAt: string | null;
  createdAt: string;
}

interface AnswerRecord {
  questionIndex: number;
  selected: number;
  correct: boolean;
  timeLeft: number;
  points: number;
}

const TRIVIA_TIME = 15;
const TRUE_FALSE_TIME = 10;
const BASE_POINTS = 100;
const MAX_TIME_BONUS = 50;

type GameState = "setup" | "loading" | "playing" | "feedback" | "results";

export default function GamesPage() {
  const { status } = useSession();
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState>("setup");
  const [gameType, setGameType] = useState<"trivia" | "true_false">("trivia");
  const [error, setError] = useState("");
  const [game, setGame] = useState<GameData | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      if (data.games) setGames(data.games);
    } catch { /* ignore */ }
    setLoadingGames(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchGames();
  }, [status, fetchGames]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const totalTime = gameType === "trivia" ? TRIVIA_TIME : TRUE_FALSE_TIME;

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(totalTime * 10);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 100);
  }

  function handleTimeUp() {
    if (showFeedback) return;
    processAnswer(-1);
  }

  function processAnswer(selected: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!game) return;

    const question = game.questions[currentQ];
    const correct = selected === question.correct_index;
    const remaining = timeLeft / 10;
    const timeBonus = correct
      ? Math.round((remaining / totalTime) * MAX_TIME_BONUS)
      : 0;
    const points = correct ? BASE_POINTS + timeBonus : 0;

    const newStreak = correct ? streak + 1 : 0;
    const newMaxStreak = Math.max(maxStreak, newStreak);

    setSelectedAnswer(selected);
    setShowFeedback(true);
    setScore((prev) => prev + points);
    setStreak(newStreak);
    setMaxStreak(newMaxStreak);

    const record: AnswerRecord = {
      questionIndex: currentQ,
      selected,
      correct,
      timeLeft: remaining,
      points,
    };
    setAnswers((prev) => [...prev, record]);

    feedbackTimeoutRef.current = setTimeout(() => {
      const nextQ = currentQ + 1;
      if (nextQ >= game.questions.length) {
        const finalScore = score + points;
        const finalAnswers = [...answers, record];
        completeGame(game.id, finalAnswers, finalScore, newMaxStreak);
        setGameState("results");
      } else {
        setCurrentQ(nextQ);
        setSelectedAnswer(null);
        setShowFeedback(false);
        startTimer();
      }
    }, 2000);
  }

  async function completeGame(
    id: string,
    finalAnswers: AnswerRecord[],
    finalScore: number,
    finalStreak: number
  ) {
    try {
      await fetch(`/api/games/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: finalAnswers,
          score: finalScore,
          streak: finalStreak,
        }),
      });
      fetchGames();
    } catch { /* ignore */ }
  }

  async function handleGenerate(text: string) {
    setGameState("loading");
    setError("");
    try {
      const res = await fetch("/api/ai/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, gameType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al generar el juego");
        setGameState("setup");
      } else {
        setGame(data);
        setCurrentQ(0);
        setScore(0);
        setStreak(0);
        setMaxStreak(0);
        setAnswers([]);
        setSelectedAnswer(null);
        setShowFeedback(false);
        setGameState("playing");
        setTimeLeft(totalTime * 10);
        setTimeout(() => startTimer(), 300);
      }
    } catch {
      setError("Error de conexión");
      setGameState("setup");
    }
  }

  function resetGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setGame(null);
    setGameState("setup");
    setCurrentQ(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta partida?")) return;
    await fetch(`/api/games?id=${id}`, { method: "DELETE" });
    setGames((prev) => prev.filter((g) => g.id !== id));
  }

  function getMedal(pct: number): string {
    if (pct >= 90) return "🏆";
    if (pct >= 70) return "🥇";
    if (pct >= 50) return "🥈";
    return "🥉";
  }

  const timerPct = (timeLeft / (totalTime * 10)) * 100;
  const timerColor =
    timerPct > 60 ? "bg-green-500" : timerPct > 30 ? "bg-yellow-500" : "bg-red-500";

  if (gameState === "loading") {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl">
              {gameType === "trivia" ? "🎯" : "✅"}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Generando preguntas...</p>
          <p className="text-gray-400 text-sm">Esto puede tomar unos segundos</p>
        </div>
      </div>
    );
  }

  if (gameState === "playing" && game) {
    const question = game.questions[currentQ];
    const isTrivia = game.gameType === "trivia";

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-primary-600">{score}</span>
            <span className="text-sm text-gray-400">pts</span>
          </div>
          <div className="text-center">
            <span className="text-sm font-medium text-gray-600">
              {currentQ + 1} / {game.questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                🔥 {streak}
              </span>
            )}
            <button
              onClick={resetGame}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="w-full h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{
              width: `${((currentQ + (showFeedback ? 1 : 0)) / game.questions.length) * 100}%`,
            }}
          />
        </div>

        <div className="card mb-6">
          <p className="text-lg font-medium text-gray-900 leading-relaxed">
            {question.statement}
          </p>
        </div>

        <div className={`grid gap-3 ${isTrivia ? "grid-cols-1" : "grid-cols-2"}`}>
          {question.options.map((option, idx) => {
            let btnClass =
              "w-full text-left p-4 rounded-xl border-2 font-medium transition-all ";

            if (showFeedback) {
              if (idx === question.correct_index) {
                btnClass +=
                  "border-green-500 bg-green-50 text-green-800 ring-2 ring-green-300";
              } else if (idx === selectedAnswer && idx !== question.correct_index) {
                btnClass +=
                  "border-red-500 bg-red-50 text-red-800 ring-2 ring-red-300";
              } else {
                btnClass += "border-gray-200 text-gray-400 opacity-50";
              }
            } else {
              btnClass +=
                "border-gray-200 hover:border-primary-400 hover:bg-primary-50 text-gray-700 active:scale-[0.98]";
            }

            if (!isTrivia) {
              btnClass += " text-center text-lg py-6";
              if (!showFeedback) {
                btnClass +=
                  idx === 0
                    ? " hover:border-green-400 hover:bg-green-50"
                    : " hover:border-red-400 hover:bg-red-50";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => !showFeedback && processAnswer(idx)}
                disabled={showFeedback}
                className={btnClass}
              >
                {isTrivia && (
                  <span className="inline-block w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-sm font-bold leading-7 text-center mr-3 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                )}
                {!isTrivia && (
                  <span className="mr-2">{idx === 0 ? "✅" : "❌"}</span>
                )}
                {option}
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div
            className={`mt-4 p-4 rounded-xl border-2 ${
              selectedAnswer === question.correct_index || selectedAnswer === -1
                ? selectedAnswer === -1
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm">
                {selectedAnswer === -1
                  ? "⏰ ¡Se acabó el tiempo!"
                  : selectedAnswer === question.correct_index
                  ? `✅ ¡Correcto! +${answers[answers.length - 1]?.points || 0} pts`
                  : "❌ Incorrecto"}
              </span>
            </div>
            <p className="text-sm text-gray-700">{question.explanation}</p>
          </div>
        )}
      </div>
    );
  }

  if (gameState === "results" && game) {
    const totalQuestions = game.questions.length;
    const correctCount = answers.filter((a) => a.correct).length;
    const pct = Math.round((correctCount / totalQuestions) * 100);
    const avgTime =
      answers.length > 0
        ? (answers.reduce((acc, a) => acc + (totalTime - a.timeLeft), 0) / answers.length).toFixed(1)
        : "0";

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center mb-8 bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-200">
          <div className="text-6xl mb-2">{getMedal(pct)}</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">
            {score} puntos
          </h2>
          <p className="text-gray-500 mb-4">{game.title}</p>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-2xl font-bold text-green-600">
                {correctCount}/{totalQuestions}
              </p>
              <p className="text-xs text-gray-500">Correctas</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-2xl font-bold text-orange-600">
                🔥 {maxStreak}
              </p>
              <p className="text-xs text-gray-500">Racha máx.</p>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-2xl font-bold text-blue-600">{avgTime}s</p>
              <p className="text-xs text-gray-500">Tiempo prom.</p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button onClick={resetGame} className="btn-primary py-2 px-6">
              Jugar de nuevo
            </button>
            <Link
              href="/dashboard"
              className="py-2 px-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Revisión de respuestas
        </h3>
        <div className="space-y-3">
          {game.questions.map((q, idx) => {
            const answer = answers[idx];
            const correct = answer?.correct;
            const timedOut = answer?.selected === -1;
            return (
              <div
                key={idx}
                className={`card border-l-4 ${
                  correct
                    ? "border-l-green-500"
                    : "border-l-red-500"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">
                    {correct ? "✅" : timedOut ? "⏰" : "❌"}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">
                      {q.statement}
                    </p>
                    {!correct && (
                      <p className="text-sm text-green-700 mb-1">
                        Correcta: {q.options[q.correct_index]}
                      </p>
                    )}
                    {answer && !timedOut && !correct && (
                      <p className="text-sm text-red-600 mb-1">
                        Tu respuesta: {q.options[answer.selected]}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">{q.explanation}</p>
                  </div>
                  {answer && (
                    <span className="text-xs font-bold text-gray-400 shrink-0">
                      +{answer.points}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/dashboard"
        className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block"
      >
        &larr; Volver al dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🎮</span>
        <h1 className="text-3xl font-bold text-gray-900">Juegos interactivos</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Poné a prueba tus conocimientos de forma divertida con trivia y
        verdadero/falso.
      </p>

      <div className="card mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Elegí el modo de juego
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            type="button"
            onClick={() => setGameType("trivia")}
            className={`p-5 rounded-xl border-2 text-center transition-all ${
              gameType === "trivia"
                ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-4xl block mb-2">🎯</span>
            <p className="font-bold text-gray-900">Trivia</p>
            <p className="text-xs text-gray-500 mt-1">
              10 preguntas de opción múltiple
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {TRIVIA_TIME}s por pregunta
            </p>
          </button>
          <button
            type="button"
            onClick={() => setGameType("true_false")}
            className={`p-5 rounded-xl border-2 text-center transition-all ${
              gameType === "true_false"
                ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-4xl block mb-2">✅❌</span>
            <p className="font-bold text-gray-900">Verdadero o Falso</p>
            <p className="text-xs text-gray-500 mt-1">
              12 afirmaciones para evaluar
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {TRUE_FALSE_TIME}s por afirmación
            </p>
          </button>
        </div>

        <MaterialInput
          onSubmit={handleGenerate}
          loading={false}
          buttonLabel={
            gameType === "trivia" ? "🎯 Empezar trivia" : "✅ Empezar juego"
          }
        />
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mis partidas</h2>

        {loadingGames ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : games.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">🕹️</p>
            <p className="text-gray-500">
              No tenés partidas todavía. Elegí un modo y empezá a jugar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((g) => {
              const pct =
                g.score !== null && g.total > 0
                  ? Math.round(
                      (g.score /
                        (g.total * (BASE_POINTS + MAX_TIME_BONUS))) *
                        100
                    )
                  : null;
              return (
                <div key={g.id} className="card hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 text-xl">
                      {g.gameType === "trivia" ? "🎯" : "✅"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {g.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>
                          {g.gameType === "trivia"
                            ? "Trivia"
                            : "V/F"}
                        </span>
                        <span>&middot;</span>
                        {g.completedAt ? (
                          <>
                            <span className="font-medium text-primary-600">
                              {g.score} pts
                            </span>
                            <span>&middot;</span>
                            <span>🔥 {g.streak}</span>
                          </>
                        ) : (
                          <span className="text-yellow-600">Sin completar</span>
                        )}
                        <span>&middot;</span>
                        <span>
                          {new Date(g.createdAt).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                      title="Eliminar"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
