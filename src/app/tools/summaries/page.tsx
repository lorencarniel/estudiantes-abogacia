"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import MaterialInput from "@/components/MaterialInput";
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
  const { text: autoText, loading: autoLoading, subjectName } = useAutoLoadMaterial();
  const autoTriggered = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (autoText && !autoTriggered.current && !loading && !result) {
      autoTriggered.current = true;
      handleGenerate(autoText);
    }
  }, [autoText]);

  async function handleGenerate(text: string, syllabusId?: string) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, level, syllabusId }),
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
          <span className="text-3xl">📄</span> Resúmenes
        </h1>
        <p className="text-gray-600 mt-2">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{result.title}</h2>

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
      )}
    </div>
  );
}
