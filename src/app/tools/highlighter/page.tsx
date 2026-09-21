"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import MaterialInput from "@/components/MaterialInput";

interface Highlight {
  text: string;
  category: "definicion" | "articulo" | "principio" | "jurisprudencia" | "concepto_clave" | "ejemplo";
  importance: "alta" | "media";
  note: string;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; bg: string; darkBg: string; text: string; darkText: string }
> = {
  definicion: {
    label: "Definición",
    bg: "bg-yellow-100",
    darkBg: "dark:bg-yellow-900/40",
    text: "text-yellow-800",
    darkText: "dark:text-yellow-300",
  },
  articulo: {
    label: "Artículo",
    bg: "bg-blue-100",
    darkBg: "dark:bg-blue-900/40",
    text: "text-blue-800",
    darkText: "dark:text-blue-300",
  },
  principio: {
    label: "Principio",
    bg: "bg-green-100",
    darkBg: "dark:bg-green-900/40",
    text: "text-green-800",
    darkText: "dark:text-green-300",
  },
  jurisprudencia: {
    label: "Jurisprudencia",
    bg: "bg-purple-100",
    darkBg: "dark:bg-purple-900/40",
    text: "text-purple-800",
    darkText: "dark:text-purple-300",
  },
  concepto_clave: {
    label: "Concepto clave",
    bg: "bg-orange-100",
    darkBg: "dark:bg-orange-900/40",
    text: "text-orange-800",
    darkText: "dark:text-orange-300",
  },
  ejemplo: {
    label: "Ejemplo",
    bg: "bg-pink-100",
    darkBg: "dark:bg-pink-900/40",
    text: "text-pink-800",
    darkText: "dark:text-pink-300",
  },
};

export default function HighlighterPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [sourceText, setSourceText] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"inline" | "cards">("inline");

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  async function handleSubmit(text: string) {
    setLoading(true);
    setError("");
    setHighlights([]);
    setSourceText(text);
    setExpandedIdx(null);

    try {
      const res = await fetch("/api/ai/highlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al analizar");
      setHighlights(data.highlights || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar el texto");
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    filterCategory === "all"
      ? highlights
      : highlights.filter((h) => h.category === filterCategory);

  const categories = Array.from(new Set(highlights.map((h) => h.category)));

  function renderInlineText() {
    if (!sourceText || highlights.length === 0) return null;

    const activeHighlights =
      filterCategory === "all"
        ? highlights
        : highlights.filter((h) => h.category === filterCategory);

    type Segment = { text: string; highlight?: Highlight };
    const segments: Segment[] = [];

    const matches: { start: number; end: number; highlight: Highlight }[] = [];
    for (const h of activeHighlights) {
      const idx = sourceText.indexOf(h.text);
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + h.text.length, highlight: h });
      }
    }
    matches.sort((a, b) => a.start - b.start);

    const merged: typeof matches = [];
    for (const m of matches) {
      if (merged.length > 0 && m.start < merged[merged.length - 1].end) continue;
      merged.push(m);
    }

    let cursor = 0;
    for (const m of merged) {
      if (m.start > cursor) {
        segments.push({ text: sourceText.slice(cursor, m.start) });
      }
      segments.push({ text: sourceText.slice(m.start, m.end), highlight: m.highlight });
      cursor = m.end;
    }
    if (cursor < sourceText.length) {
      segments.push({ text: sourceText.slice(cursor) });
    }

    return (
      <div className="card prose prose-sm max-w-none text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
        {segments.map((seg, i) => {
          if (!seg.highlight) return <span key={i}>{seg.text}</span>;
          const cfg = CATEGORY_CONFIG[seg.highlight.category];
          return (
            <span
              key={i}
              className={`${cfg.bg} ${cfg.darkBg} ${cfg.text} ${cfg.darkText} px-0.5 rounded cursor-pointer border-b-2 ${
                seg.highlight.importance === "alta" ? "border-b-primary-500" : "border-b-transparent"
              }`}
              title={`${cfg.label}: ${seg.highlight.note}`}
            >
              {seg.text}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🖍️</span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Resaltador inteligente
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Identificá automáticamente las frases y conceptos clave de tus apuntes
        </p>
      </div>

      {highlights.length === 0 && (
        <MaterialInput
          onSubmit={handleSubmit}
          loading={loading}
          buttonLabel="Analizar"
        />
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {highlights.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setViewMode("inline")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "inline"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              Vista en texto
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "cards"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              Vista en tarjetas
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterCategory === "all"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Todos ({highlights.length})
            </button>
            {categories.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const count = highlights.filter((h) => h.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterCategory === cat
                      ? `${cfg.bg} ${cfg.darkBg} ${cfg.text} ${cfg.darkText}`
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className={`w-3 h-3 rounded ${cfg.bg} ${cfg.darkBg}`}
                />
                <span className="text-gray-500 dark:text-gray-400">
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>

          {viewMode === "inline" && renderInlineText()}

          {viewMode === "cards" && (
            <div className="space-y-3">
              {filtered.map((h, i) => {
                const cfg = CATEGORY_CONFIG[h.category];
                const isExpanded = expandedIdx === i;
                return (
                  <div
                    key={i}
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className={`rounded-lg p-4 cursor-pointer transition-all border-l-4 ${cfg.bg} ${cfg.darkBg} ${
                      h.importance === "alta"
                        ? "border-l-primary-500"
                        : "border-l-gray-300 dark:border-l-gray-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm font-medium ${cfg.text} ${cfg.darkText}`}>
                        &ldquo;{h.text}&rdquo;
                      </p>
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.darkBg} ${cfg.text} ${cfg.darkText}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {h.note}
                        </p>
                        {h.importance === "alta" && (
                          <span className="inline-block mt-2 text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">
                            IMPORTANCIA ALTA
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setHighlights([]);
                setSourceText("");
                setFilterCategory("all");
              }}
              className="btn-secondary text-sm py-2 px-4"
            >
              Analizar otro texto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
