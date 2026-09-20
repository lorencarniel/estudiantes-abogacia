"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface Comparison {
  concept_a: string;
  concept_b: string;
  definition_a: string;
  definition_b: string;
  differences: string[];
  similarities: string[];
  articles: string;
  example: string;
}

interface CompareData {
  title: string;
  comparisons: Comparison[];
}

export default function ComparePage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CompareData | null>(null);
  const [error, setError] = useState("");

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  const handleGenerate = useCallback(async (text: string, syllabusId?: string) => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, syllabusId }),
      });
      const result = await res.json();
      if (!res.ok) { setError(result.error || "Error al generar"); return; }
      setData(result);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </Link>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">⚖️</span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Comparador de conceptos</h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Pegá tu apunte y la IA identifica conceptos que se prestan a confusión y genera una tabla comparativa.
      </p>

      {!data && (
        <div className="card">
          <MaterialInput onSubmit={handleGenerate} loading={loading} buttonLabel="Comparar conceptos" />
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{data.title}</h2>
            <button onClick={() => setData(null)} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Nueva comparación
            </button>
          </div>

          <div className="space-y-8">
            {data.comparisons.map((comp, i) => (
              <div key={i} className="card border-l-4 border-l-primary-500">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg font-bold text-primary-700">{comp.concept_a}</span>
                  <span className="text-gray-400 text-sm">vs</span>
                  <span className="text-lg font-bold text-indigo-700">{comp.concept_b}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-primary-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-primary-600 uppercase mb-1">{comp.concept_a}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comp.definition_a}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">{comp.concept_b}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comp.definition_b}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase mb-2">Diferencias</p>
                    <ul className="space-y-1">
                      {comp.differences.map((d, j) => (
                        <li key={j} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                          <span className="text-red-400 shrink-0">✗</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase mb-2">Semejanzas</p>
                    <ul className="space-y-1">
                      {comp.similarities.map((s, j) => (
                        <li key={j} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                          <span className="text-green-400 shrink-0">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {comp.articles && (
                  <div className="bg-pink-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-pink-600 uppercase mb-1">Normativa</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comp.articles}</p>
                  </div>
                )}

                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Ejemplo práctico</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{comp.example}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
