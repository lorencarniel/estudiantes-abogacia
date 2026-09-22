"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import MaterialInput from "@/components/MaterialInput";
import ExportPDF from "@/components/ExportPDF";
import { useAutoLoadMaterial } from "@/hooks/useAutoLoadMaterial";

interface SummaryResult {
  title: string;
  summary: string;
  key_concepts: Array<{ term: string; definition: string }>;
}

export default function SummariesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState("");
  const [level, setLevel] = useState<"corto" | "mediano" | "detallado">("mediano");
  const [sourceText, setSourceText] = useState("");
  const [expanding, setExpanding] = useState(false);
  const [expandCount, setExpandCount] = useState(0);
  const { text: autoText, loading: autoLoading, subjectName } = useAutoLoadMaterial();
  const autoTriggered = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (autoText && !autoTriggered.current && !loading && !result) {
      autoTriggered.current = true;
      handleGenerate(autoText);
    }
  }, [autoText]);

  async function handleGenerate(text: string, syllabusId?: string, options?: { simpleMode?: boolean }) {
    setLoading(true);
    setError("");
    setResult(null);
    setSourceText(text);
    setExpandCount(0);

    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, level, syllabusId, simpleMode: options?.simpleMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar");
    } finally {
      setLoading(false);
    }
  }

  async function handleExpand() {
    if (!result || !sourceText) return;
    setExpanding(true);
    setError("");

    try {
      const conceptsText = result.key_concepts.map(c => `${c.term}: ${c.definition}`).join("\n");
      const res = await fetch("/api/ai/summary/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          currentSummary: result.summary,
          currentConcepts: conceptsText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setExpandCount(expandCount + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al expandir");
    } finally {
      setExpanding(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <span className="text-3xl">📄</span> Resúmenes
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Pegá tu apunte y la IA genera un resumen con los conceptos clave resaltados.
        </p>
      </div>

      {(autoLoading || (autoText && loading && !result)) && (
        <div className="card text-center py-12 mb-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            Cargando apunte de {subjectName}...
          </p>
        </div>
      )}

      {!autoLoading && !(autoText && loading && !result) && !result && (
      <div className="card mb-8">
        <MaterialInput
          onSubmit={handleGenerate}
          loading={loading}
          buttonLabel="Generar resumen"
          showSimpleMode
        >
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-1">
              Nivel de profundidad
            </label>
            <select
              id="level"
              className="input-field"
              value={level}
              onChange={(e) => setLevel(e.target.value as typeof level)}
              disabled={loading}
            >
              <option value="corto">Corto (lo esencial, ~300 palabras)</option>
              <option value="mediano">Mediano (desarrollo, 500-800 palabras)</option>
              <option value="detallado">Detallado (exhaustivo, 800-1500 palabras)</option>
            </select>
          </div>
        </MaterialInput>
      </div>
      )}

      {error && (
        <div className="card border-red-200 bg-red-50 mb-8">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{result.title}</h2>
            <ExportPDF contentRef={contentRef} fileName={result.title} />
          </div>
          <div ref={contentRef}>

          <div className="prose prose-gray max-w-none mb-8">
            {result.summary.split("\n").map((paragraph, i) => (
              <p key={i} dangerouslySetInnerHTML={{
                __html: paragraph.replace(
                  /\*\*(.*?)\*\*/g,
                  '<strong class="text-primary-800">$1</strong>'
                ),
              }} />
            ))}
          </div>

          {result.key_concepts.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Conceptos clave</h3>
              <div className="grid gap-3">
                {result.key_concepts.map((concept, i) => (
                  <div key={i} className="bg-primary-50 rounded-lg p-4">
                    <dt className="font-semibold text-primary-900">{concept.term}</dt>
                    <dd className="text-gray-700 mt-1">{concept.definition}</dd>
                  </div>
                ))}
              </div>
            </div>
          )}

          </div>
          <div className="border-t border-gray-100 pt-6 mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => { sessionStorage.setItem("crossToolText", sourceText); router.push("/tools/highlighter"); }}
              className="text-sm px-4 py-2 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 font-medium transition-colors"
            >
              🖍️ Resaltar
            </button>
            <button
              onClick={() => { sessionStorage.setItem("crossToolText", sourceText); router.push("/tools/outlines"); }}
              className="text-sm px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 font-medium transition-colors"
            >
              📊 Generar esquema
            </button>
            <button
              onClick={() => { sessionStorage.setItem("crossToolText", sourceText); router.push("/tools/flashcards"); }}
              className="text-sm px-4 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 font-medium transition-colors"
            >
              🃏 Flashcards
            </button>
            <button
              onClick={() => { sessionStorage.setItem("crossToolText", sourceText); router.push("/tools/quizzes"); }}
              className="text-sm px-4 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 font-medium transition-colors"
            >
              ✅ Quiz
            </button>
            <button
              onClick={() => { sessionStorage.setItem("crossToolText", sourceText); router.push("/tools/games"); }}
              className="text-sm px-4 py-2 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400 dark:hover:bg-pink-900/50 font-medium transition-colors"
            >
              🎮 Juego
            </button>
          </div>

          <div className="border-t border-gray-100 pt-6 mt-6">
            {expanding ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Expandiendo resumen...</p>
              </div>
            ) : (
              <div className="bg-primary-50 rounded-lg p-4 text-center">
                <p className="text-primary-800 font-medium mb-3">
                  ¿Querés agregar más detalles al resumen?
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={handleExpand}
                    className="btn-primary text-sm py-2 px-6"
                  >
                    Sí, expandir
                  </button>
                  <button
                    onClick={() => setResult({ ...result, title: result.title })}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium py-2 px-4"
                  >
                    No, está bien así
                  </button>
                </div>
                {expandCount > 0 && (
                  <p className="text-xs text-primary-500 mt-2">
                    Expandido {expandCount} {expandCount === 1 ? "vez" : "veces"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
