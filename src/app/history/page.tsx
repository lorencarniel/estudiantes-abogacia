"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HistoryItem {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  data: Record<string, unknown>;
}

const TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
  summary: { icon: "📄", label: "Resumen", color: "bg-blue-100 text-blue-700" },
  outline: { icon: "📊", label: "Esquema", color: "bg-indigo-100 text-indigo-700" },
  concept_map: { icon: "🗺️", label: "Mapa conceptual", color: "bg-purple-100 text-purple-700" },
  quiz: { icon: "📝", label: "Cuestionario", color: "bg-green-100 text-green-700" },
  flashcard_deck: { icon: "🃏", label: "Flashcards", color: "bg-amber-100 text-amber-700" },
  schedule: { icon: "📅", label: "Cronograma", color: "bg-teal-100 text-teal-700" },
  audio: { icon: "🎧", label: "Audio", color: "bg-pink-100 text-pink-700" },
  game: { icon: "🎮", label: "Juego", color: "bg-rose-100 text-rose-700" },
  video: { icon: "🎬", label: "Video", color: "bg-violet-100 text-violet-700" },
  comparison: { icon: "⚖️", label: "Comparación", color: "bg-cyan-100 text-cyan-700" },
  practical_case: { icon: "📋", label: "Caso práctico", color: "bg-orange-100 text-orange-700" },
  oral_exam: { icon: "🎤", label: "Examen oral", color: "bg-red-100 text-red-700" },
  mnemonic: { icon: "🧠", label: "Mnemotécnico", color: "bg-lime-100 text-lime-700" },
  glossary: { icon: "📚", label: "Glosario", color: "bg-emerald-100 text-emerald-700" },
  highlight: { icon: "🖍️", label: "Resaltador", color: "bg-yellow-100 text-yellow-700" },
};

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "summary", label: "Resúmenes" },
  { key: "outline", label: "Esquemas" },
  { key: "concept_map", label: "Mapas" },
  { key: "quiz", label: "Cuestionarios" },
  { key: "flashcard_deck", label: "Flashcards" },
  { key: "schedule", label: "Cronogramas" },
  { key: "audio", label: "Audios" },
  { key: "game", label: "Juegos" },
  { key: "video", label: "Videos" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/history" : `/api/history?type=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setItems(data.items);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (status === "authenticated") fetchHistory();
  }, [status, fetchHistory]);

  async function handleDelete(item: HistoryItem) {
    if (!confirm(`¿Eliminar "${item.title}"?`)) return;
    await fetch(`/api/history?id=${item.id}&type=${item.type}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (selectedItem?.id === item.id) setSelectedItem(null);
  }

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">📚</span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mi historial</h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Todo tu material de estudio generado, guardado y listo para revisar.
      </p>

      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">📭</p>
          <p className="text-gray-500 text-lg font-medium">No tenés contenido guardado todavía</p>
          <p className="text-gray-400 text-sm mt-2">
            Generá resúmenes, esquemas, mapas o cuestionarios y van a aparecer acá.
          </p>
          <Link href="/dashboard" className="btn-primary inline-block mt-6">
            Ir a las herramientas
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`space-y-3 ${selectedItem ? "lg:col-span-1" : "lg:col-span-3"}`}>
            {items.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.summary;
              return (
                <div
                  key={item.id}
                  className={`card cursor-pointer hover:shadow-md transition-all ${
                    selectedItem?.id === item.id ? "ring-2 ring-primary-500" : ""
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                        {item.type === "quiz" && (item.data as { completed?: boolean }).completed && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            (item.data as { passed?: boolean }).passed
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {(item.data as { score?: number }).score}/{(item.data as { total?: number }).total}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(item.createdAt)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedItem && (
            <div className="lg:col-span-2">
              <div className="card sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedItem.title}</h2>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ContentPreview item={selectedItem} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ContentPreview({ item }: { item: HistoryItem }) {
  const data = item.data;

  if (item.type === "summary") {
    const d = data as { summary?: string; key_concepts?: { term: string; definition: string }[] };
    return (
      <div className="space-y-4">
        <div
          className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{
            __html: (d.summary || "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>"),
          }}
        />
        {d.key_concepts && d.key_concepts.length > 0 && (
          <div className="border-t dark:border-gray-700 pt-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Conceptos clave</h3>
            <div className="space-y-2">
              {d.key_concepts.map((c, i) => (
                <div key={i} className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
                  <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">{c.term}</p>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">{c.definition}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (item.type === "outline") {
    const d = data as { sections?: { heading: string; note?: string; items: { text: string; note?: string }[] }[] };
    return (
      <div className="space-y-4">
        {d.sections?.map((s, i) => (
          <div key={i}>
            <h3 className="font-bold text-gray-900 dark:text-white">{s.heading}</h3>
            {s.note && <p className="text-gray-500 dark:text-gray-400 text-sm">{s.note}</p>}
            <ul className="mt-2 space-y-1 ml-4">
              {s.items.map((it, j) => (
                <li key={j} className="text-gray-700 dark:text-gray-300 text-sm list-disc">
                  {it.text}
                  {it.note && <span className="text-gray-400 text-xs ml-2">— {it.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (item.type === "concept_map") {
    const d = data as { nodes?: { label: string; category: string }[]; edges?: { source: string; target: string; label: string }[] };
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {d.nodes?.length || 0} conceptos, {d.edges?.length || 0} conexiones
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {d.nodes?.map((n, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{n.label}</p>
              <p className="text-xs text-gray-400">{n.category}</p>
            </div>
          ))}
        </div>
        <Link
          href="/tools/maps"
          className="btn-primary inline-block text-sm py-2 px-4"
        >
          Abrir en editor
        </Link>
      </div>
    );
  }

  if (item.type === "quiz") {
    const d = data as {
      completed?: boolean;
      score?: number;
      total?: number;
      passed?: boolean;
      difficulty?: string;
      questions?: { statement: string; options: string[]; correct_index: number; explanation: string }[];
      answers?: number[];
    };

    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            Dificultad: {d.difficulty}
          </span>

          {d.completed && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              d.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {d.score}/{d.total} — {d.passed ? "Aprobado" : "No aprobado"}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {d.questions?.map((q, i) => {
            const userAnswer = d.answers?.[i];
            const isCorrect = userAnswer === q.correct_index;
            return (
              <div key={i} className="border dark:border-gray-700 rounded-lg p-3">
                <p className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                  {i + 1}. {q.statement}
                </p>
                <div className="space-y-1">
                  {q.options.map((opt, j) => {
                    let optClass = "text-gray-600 dark:text-gray-400";
                    if (d.completed) {
                      if (j === q.correct_index) optClass = "text-green-700 dark:text-green-400 font-semibold";
                      else if (j === userAnswer && !isCorrect) optClass = "text-red-500 dark:text-red-400 line-through";
                    }
                    return (
                      <p key={j} className={`text-sm ${optClass}`}>
                        {String.fromCharCode(65 + j)}) {opt}
                      </p>
                    );
                  })}
                </div>
                {d.completed && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 rounded p-2">{q.explanation}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (item.type === "flashcard_deck") {
    const d = data as { cardCount?: number; cards?: { front: string; back: string }[] };
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">{d.cardCount || d.cards?.length || 0} tarjetas</p>
        <div className="space-y-2">
          {d.cards?.slice(0, 10).map((c, i) => (
            <div key={i} className="border dark:border-gray-700 rounded-lg p-3">
              <p className="font-medium text-gray-900 dark:text-white text-sm">{c.front}</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{c.back}</p>
            </div>
          ))}
          {(d.cards?.length || 0) > 10 && (
            <p className="text-xs text-gray-400 text-center">
              +{(d.cards?.length || 0) - 10} tarjetas más
            </p>
          )}
        </div>
        <Link
          href="/tools/flashcards"
          className="btn-primary inline-block text-sm py-2 px-4"
        >
          Estudiar este mazo
        </Link>
      </div>
    );
  }

  if (item.type === "schedule") {
    const d = data as { examDate?: string; totalDays?: number; completedDays?: number };
    const progress = d.totalDays ? Math.round(((d.completedDays || 0) / d.totalDays) * 100) : 0;
    return (
      <div className="space-y-4">
        <div className="flex gap-3 text-sm">
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold">
            {d.totalDays} días
          </span>
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold">
            Examen: {d.examDate ? new Date(d.examDate).toLocaleDateString("es-AR") : "—"}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">Progreso</span>
            <span className="text-sm font-bold text-primary-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <Link
          href="/tools/schedules"
          className="btn-primary inline-block text-sm py-2 px-4"
        >
          Ver cronograma
        </Link>
      </div>
    );
  }

  if (item.type === "audio") {
    const d = data as { duration?: number; voice?: string };
    const mins = d.duration ? Math.floor(d.duration / 60) : 0;
    const secs = d.duration ? d.duration % 60 : 0;
    return (
      <div className="space-y-4">
        <div className="flex gap-3 text-sm">
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold">
            ~{mins > 0 ? `${mins}min ${secs}s` : `${secs}s`}
          </span>
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold">
            Voz: {d.voice || "nova"}
          </span>
        </div>
        <Link
          href="/tools/audios"
          className="btn-primary inline-block text-sm py-2 px-4"
        >
          Ir a mis audios
        </Link>
      </div>
    );
  }

  if (item.type === "game") {
    const d = data as { gameType?: string; score?: number; total?: number; streak?: number; completed?: boolean };
    const maxPossible = (d.total || 0) * 150;
    const pct = maxPossible > 0 && d.score != null ? Math.round((d.score / maxPossible) * 100) : null;
    return (
      <div className="space-y-4">
        <div className="flex gap-3 text-sm">
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold">
            {
              {trivia:"🎯 Trivia", true_false:"✅ V/F", matching:"🔗 Relacionar", ordering:"📋 Ordenar", fill_blank:"✏️ Completar",
               hangman:"💀 Ahorcado", memory:"🧠 Memotest", categorize:"📂 Categorizar", article_fill:"📜 Artículos",
               millionaire:"💰 Millonario", timeline:"📅 Línea de tiempo", crossword:"⬜ Crucigrama"}[d.gameType || ""] || d.gameType
            }
          </span>
          {d.completed && d.score != null && (
            <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-semibold">
              {d.score} pts
            </span>
          )}
          {d.streak != null && d.streak > 0 && (
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
              🔥 Racha: {d.streak}
            </span>
          )}
        </div>
        {!d.completed && (
          <p className="text-sm text-yellow-600">Partida sin completar</p>
        )}
        <Link
          href="/tools/games"
          className="btn-primary inline-block text-sm py-2 px-4"
        >
          Jugar de nuevo
        </Link>
      </div>
    );
  }

  if (item.type === "video") {
    const d = data as { duration?: number; voice?: string; slideCount?: number };
    const mins = d.duration ? Math.floor(d.duration / 60) : 0;
    const secs = d.duration ? d.duration % 60 : 0;
    return (
      <div className="space-y-4">
        <div className="flex gap-3 text-sm">
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold">
            {d.slideCount || 0} slides
          </span>
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold">
            ~{mins > 0 ? `${mins}min ${secs}s` : `${secs}s`}
          </span>
          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-semibold">
            Voz: {d.voice || "nova"}
          </span>
        </div>
        <Link
          href="/tools/videos"
          className="btn-primary inline-block text-sm py-2 px-4"
        >
          Ver video
        </Link>
      </div>
    );
  }

  return <p className="text-gray-500">Vista previa no disponible</p>;
}
