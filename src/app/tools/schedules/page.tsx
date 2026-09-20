"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Block {
  subject: string;
  activity: string;
  minutes: number;
}

interface Day {
  date: string;
  label: string;
  blocks: Block[];
}

interface Subject {
  name: string;
  mastery: number;
}

interface Schedule {
  id: string;
  title: string;
  examDate: string;
  hoursPerDay: number;
  subjects: Subject[];
  schedule: Day[];
  completedDays: string[];
  createdAt: string;
}

const MASTERY_LABELS = ["", "Muy bajo", "Bajo", "Regular", "Bueno", "Excelente"];
const MASTERY_COLORS = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-600"];

const ACTIVITY_ICONS: Record<string, string> = {
  leer: "📖",
  resumir: "📝",
  practicar: "💪",
  repasar: "🔄",
};

const ACTIVITY_TOOLS: Record<string, { href: string; label: string }> = {
  leer: { href: "/tools/summaries", label: "Generar resumen" },
  resumir: { href: "/tools/outlines", label: "Hacer esquema" },
  practicar: { href: "/tools/quizzes", label: "Hacer quiz" },
  repasar: { href: "/tools/flashcards", label: "Usar flashcards" },
};

function getActivityTool(activity: string): { href: string; label: string } | null {
  const lower = activity.toLowerCase();
  for (const [key, tool] of Object.entries(ACTIVITY_TOOLS)) {
    if (lower.includes(key)) return tool;
  }
  return null;
}

function getActivityIcon(activity: string): string {
  const lower = activity.toLowerCase();
  for (const [key, icon] of Object.entries(ACTIVITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "📚";
}

export default function SchedulesPage() {
  const { status } = useSession();
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([{ name: "", mastery: 3 }]);
  const [examDate, setExamDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [viewSchedule, setViewSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      if (data.schedules) setSchedules(data.schedules);
    } catch { /* ignore */ }
    setLoadingSchedules(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchSchedules();
  }, [status, fetchSchedules]);

  function addSubject() {
    if (subjects.length >= 20) return;
    setSubjects([...subjects, { name: "", mastery: 3 }]);
  }

  function removeSubject(index: number) {
    if (subjects.length <= 1) return;
    setSubjects(subjects.filter((_, i) => i !== index));
  }

  function updateSubject(index: number, field: "name" | "mastery", value: string | number) {
    setSubjects(subjects.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validSubjects = subjects.filter((s) => s.name.trim());
    if (validSubjects.length === 0) {
      setError("Agregá al menos un tema");
      return;
    }
    if (!examDate) {
      setError("Seleccioná la fecha del examen");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: validSubjects,
          examDate,
          hoursPerDay,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al generar cronograma");
      } else {
        await fetchSchedules();
        const fresh = await fetch("/api/schedules").then((r) => r.json());
        if (fresh.schedules?.[0]) {
          setViewSchedule(fresh.schedules[0]);
        }
      }
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  }

  async function handleToggleDay(scheduleId: string, date: string, currentlyCompleted: boolean) {
    try {
      const res = await fetch(`/api/schedules/${scheduleId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, completed: !currentlyCompleted }),
      });
      const data = await res.json();
      if (res.ok) {
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === scheduleId ? { ...s, completedDays: data.completedDays } : s
          )
        );
        if (viewSchedule?.id === scheduleId) {
          setViewSchedule((prev) =>
            prev ? { ...prev, completedDays: data.completedDays } : prev
          );
        }
      }
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este cronograma?")) return;
    await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    if (viewSchedule?.id === id) setViewSchedule(null);
  }

  function getMinDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  function getMaxDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split("T")[0];
  }

  if (viewSchedule) {
    const today = new Date().toISOString().split("T")[0];
    const totalDays = viewSchedule.schedule.length;
    const completedCount = viewSchedule.completedDays.length;
    const progress = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => setViewSchedule(null)}
          className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block"
        >
          &larr; Volver a mis cronogramas
        </button>

        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{viewSchedule.title}</h1>
          <span className="text-sm text-gray-500 shrink-0">
            Examen: {new Date(viewSchedule.examDate).toLocaleDateString("es-AR")}
          </span>
        </div>

        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso general</span>
            <span className="text-sm font-bold text-primary-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {completedCount} de {totalDays} días completados &middot; {viewSchedule.hoursPerDay}h/día
          </p>
        </div>

        <div className="space-y-3">
          {viewSchedule.schedule.map((day) => {
            const isCompleted = viewSchedule.completedDays.includes(day.date);
            const isToday = day.date === today;
            const isPast = day.date < today;
            const totalMin = day.blocks.reduce((sum, b) => sum + b.minutes, 0);

            return (
              <div
                key={day.date}
                className={`card transition-all ${
                  isToday ? "ring-2 ring-primary-500 bg-primary-50" : ""
                } ${isCompleted ? "bg-green-50 border-green-200" : ""} ${
                  isPast && !isCompleted ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleDay(viewSchedule.id, day.date, isCompleted)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 hover:border-primary-400"
                      }`}
                    >
                      {isCompleted && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <div>
                      <p className={`font-semibold ${isToday ? "text-primary-700" : "text-gray-900"}`}>
                        {day.label}
                        {isToday && (
                          <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">
                            HOY
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(day.date + "T12:00:00").toLocaleDateString("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })} &middot; {Math.round(totalMin / 60 * 10) / 10}h
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 ml-9">
                  {day.blocks.map((block, bi) => {
                    const tool = getActivityTool(block.activity);
                    return (
                      <div
                        key={bi}
                        className="flex items-center gap-3 text-sm bg-white rounded-lg p-2 border border-gray-100"
                      >
                        <span className="text-lg">{getActivityIcon(block.activity)}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{block.subject}</p>
                          <p className="text-gray-500 text-xs">{block.activity}</p>
                        </div>
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {block.minutes} min
                        </span>
                        {tool && (
                          <Link
                            href={`${tool.href}?subject=${encodeURIComponent(block.subject)}`}
                            className="text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                          >
                            Estudiar
                          </Link>
                        )}
                      </div>
                    );
                  })}
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
        <span className="text-3xl">📅</span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cronogramas de estudio</h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        La IA arma tu plan día por día hasta el examen, priorizando temas débiles.
      </p>

      <div className="card mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Crear cronograma</h2>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temas del programa
            </label>
            <div className="space-y-3">
              {subjects.map((sub, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={sub.name}
                    onChange={(e) => updateSubject(i, "name", e.target.value)}
                    placeholder={`Tema ${i + 1} (ej: Derecho Penal - Parte General)`}
                    className="input-field flex-1"
                    disabled={loading}
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => updateSubject(i, "mastery", level)}
                        className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                          sub.mastery >= level
                            ? `${MASTERY_COLORS[level]} text-white`
                            : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                        }`}
                        title={MASTERY_LABELS[level]}
                        disabled={loading}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  {subjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubject(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      disabled={loading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <button
                type="button"
                onClick={addSubject}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                disabled={loading || subjects.length >= 20}
              >
                + Agregar tema
              </button>
              <span className="text-xs text-gray-400">
                1-5: nivel de dominio (1 = muy bajo, 5 = excelente)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="exam-date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha del examen
              </label>
              <input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="input-field"
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="hours-day" className="block text-sm font-medium text-gray-700 mb-1">
                Horas de estudio por día
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="hours-day"
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
                  className="flex-1"
                  disabled={loading}
                />
                <span className="text-lg font-bold text-primary-700 w-12 text-center">
                  {hoursPerDay}h
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full sm:w-auto"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                Generando cronograma...
              </span>
            ) : (
              "Generar cronograma"
            )}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Mis cronogramas</h2>

        {loadingSchedules ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500">
              No tenés cronogramas todavía. Creá uno arriba con tus temas y fecha de examen.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((sched) => {
              const totalDays = sched.schedule.length;
              const completedCount = sched.completedDays.length;
              const progress = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;
              const daysLeft = Math.max(
                0,
                Math.ceil(
                  (new Date(sched.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
              );

              return (
                <div key={sched.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{sched.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {sched.subjects.length} temas &middot; {totalDays} días &middot;{" "}
                        {daysLeft > 0 ? `${daysLeft} días para el examen` : "Examen pasado"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(sched.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-primary-700">{progress}%</span>
                  </div>

                  <button
                    onClick={() => setViewSchedule(sched)}
                    className="btn-primary w-full text-sm py-2"
                  >
                    Ver cronograma
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
