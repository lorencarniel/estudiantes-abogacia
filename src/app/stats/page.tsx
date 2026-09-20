"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Stats {
  totalItems: number;
  studyStreak: number;
  quizzes: { total: number; passed: number; avgScore: number };
  flashcards: { decks: number; cards: number };
  games: { total: number; avgScore: number; bestStreak: number };
  schedules: { total: number; daysCompleted: number };
  audios: number;
  videos: number;
  content: number;
  activityByDay: { date: string; count: number }[];
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" });
}

export default function StatsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/stats")
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setStats(data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!stats) return null;

  const maxActivity = Math.max(...stats.activityByDay.map((d) => d.count), 1);

  const statCards = [
    {
      label: "Material generado",
      value: stats.totalItems,
      icon: "📚",
      color: "from-blue-500 to-indigo-600",
    },
    {
      label: "Racha de estudio",
      value: `${stats.studyStreak} día${stats.studyStreak !== 1 ? "s" : ""}`,
      icon: "🔥",
      color: "from-orange-500 to-red-600",
    },
    {
      label: "Cuestionarios aprobados",
      value: stats.quizzes.total > 0
        ? `${stats.quizzes.passed}/${stats.quizzes.total}`
        : "—",
      icon: "📝",
      color: "from-green-500 to-emerald-600",
    },
    {
      label: "Mejor racha en juegos",
      value: stats.games.bestStreak > 0 ? `🔥 ${stats.games.bestStreak}` : "—",
      icon: "🎮",
      color: "from-purple-500 to-pink-600",
    },
  ];

  const toolBreakdown = [
    { icon: "📄", label: "Resúmenes / Esquemas / Mapas", count: stats.content },
    { icon: "📝", label: "Cuestionarios", count: stats.quizzes.total },
    { icon: "🃏", label: "Mazos de flashcards", count: stats.flashcards.decks },
    { icon: "📅", label: "Cronogramas", count: stats.schedules.total },
    { icon: "🎧", label: "Audios", count: stats.audios },
    { icon: "🎮", label: "Juegos", count: stats.games.total },
    { icon: "🎬", label: "Videos", count: stats.videos },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Estadísticas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Tu progreso de estudio</p>
        </div>
        <Link
          href="/dashboard"
          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
        >
          &larr; Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-xl p-5 text-white shadow-md"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.color}`}
            />
            <div className="relative">
              <span className="text-2xl">{card.icon}</span>
              <p className="text-2xl font-bold mt-2">{card.value}</p>
              <p className="text-white/80 text-xs mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Actividad (últimos 7 días)
          </h2>
          <div className="flex items-end justify-between gap-2 h-32">
            {stats.activityByDay.map((day) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {day.count > 0 ? day.count : ""}
                </span>
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    day.count > 0
                      ? "bg-primary-500"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}
                  style={{
                    height: `${
                      day.count > 0
                        ? Math.max((day.count / maxActivity) * 100, 12)
                        : 8
                    }%`,
                  }}
                />
                <span className="text-[10px] text-gray-400">
                  {formatDay(day.date)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Por herramienta
          </h2>
          <div className="space-y-3">
            {toolBreakdown.map((tool) => {
              const pct =
                stats.totalItems > 0
                  ? (tool.count / stats.totalItems) * 100
                  : 0;
              return (
                <div key={tool.label} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{tool.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {tool.label}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white ml-2">
                        {tool.count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {(stats.quizzes.total > 0 || stats.games.total > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stats.quizzes.total > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Rendimiento en cuestionarios
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary-600">
                    {stats.quizzes.avgScore}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Promedio</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.quizzes.passed}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aprobados</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                    {stats.quizzes.total}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Tasa de aprobación</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {Math.round(
                      (stats.quizzes.passed / stats.quizzes.total) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${
                        (stats.quizzes.passed / stats.quizzes.total) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {stats.games.total > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Rendimiento en juegos
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary-600">
                    {stats.games.avgScore}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Puntaje prom.</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-orange-600">
                    🔥 {stats.games.bestStreak}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mejor racha</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                    {stats.games.total}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Partidas</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {stats.flashcards.cards > 0 && (
        <div className="card mt-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Flashcards</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            <span className="font-bold text-primary-600">
              {stats.flashcards.cards}
            </span>{" "}
            tarjetas en{" "}
            <span className="font-bold">{stats.flashcards.decks}</span> mazos
          </p>
        </div>
      )}
    </div>
  );
}
