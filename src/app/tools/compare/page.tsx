"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface ComparisonDifference {
  aspect: string;
  concept_a_value: string;
  concept_b_value: string;
  source_a: string;
  source_b: string;
}

interface ComparisonSimilarity {
  statement: string;
  source_fragment: string;
}

interface Comparison {
  concept_a: string;
  concept_b: string;
  concept_a_supported: boolean;
  concept_b_supported: boolean;
  definition_a: string;
  definition_b: string;
  differences: ComparisonDifference[];
  similarities: ComparisonSimilarity[];
  articles: string;
  example: string;
  example_type: "source" | "didactic" | "none";
  warnings: string[];
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

  const handleGenerate = useCallback(async (text: string, syllabusId?: string, options?: { simpleMode?: boolean }) => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, syllabusId, simpleMode: options?.simpleMode }),
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

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </Link>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">&#9878;&#65039;</span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Comparador de conceptos</h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        La IA identifica conceptos que se prestan a confusión y genera una comparación basada en tu material.
      </p>

      {!data && (
        <div className="card">
          <MaterialInput onSubmit={handleGenerate} loading={loading} buttonLabel="Comparar conceptos" showSimpleMode />
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{data.title}</h2>
            <button onClick={() => setData(null)} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Nueva comparaci&oacute;n
            </button>
          </div>

          <div className="space-y-8">
            {data.comparisons.map((comp, i) => (
              <div key={i} className="card border-l-4 border-l-primary-500">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg font-bold text-primary-700 dark:text-primary-400">{comp.concept_a}</span>
                  <span className="text-gray-400 text-sm">vs</span>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{comp.concept_b}</span>
                </div>

                {/* Warnings */}
                {comp.warnings?.length > 0 && (
                  <div className="mb-4 space-y-1">
                    {comp.warnings.map((w, j) => (
                      <p key={j} className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-3 py-1.5">
                        {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Definitions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className={`rounded-lg p-3 ${comp.concept_a_supported ? "bg-primary-50 dark:bg-primary-900/20" : "bg-gray-50 dark:bg-gray-800"}`}>
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase mb-1">
                      {comp.concept_a}
                      {!comp.concept_a_supported && (
                        <span className="ml-2 text-amber-600 dark:text-amber-400 normal-case font-normal">(cobertura parcial)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comp.definition_a}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${comp.concept_b_supported ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-gray-50 dark:bg-gray-800"}`}>
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mb-1">
                      {comp.concept_b}
                      {!comp.concept_b_supported && (
                        <span className="ml-2 text-amber-600 dark:text-amber-400 normal-case font-normal">(cobertura parcial)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comp.definition_b}</p>
                  </div>
                </div>

                {/* Differences table */}
                {comp.differences.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-2">Diferencias</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium text-xs">Aspecto</th>
                            <th className="text-left py-2 px-2 text-primary-600 dark:text-primary-400 font-medium text-xs">{comp.concept_a}</th>
                            <th className="text-left py-2 px-2 text-indigo-600 dark:text-indigo-400 font-medium text-xs">{comp.concept_b}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comp.differences.map((d, j) => (
                            <tr key={j} className="border-b border-gray-100 dark:border-gray-800">
                              <td className="py-2 px-2 text-gray-600 dark:text-gray-400 font-medium text-xs align-top">{d.aspect}</td>
                              <td className="py-2 px-2 text-gray-700 dark:text-gray-300 align-top">
                                <p>{d.concept_a_value}</p>
                                {d.source_a && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">&ldquo;{d.source_a}&rdquo;</p>
                                )}
                              </td>
                              <td className="py-2 px-2 text-gray-700 dark:text-gray-300 align-top">
                                <p>{d.concept_b_value}</p>
                                {d.source_b && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">&ldquo;{d.source_b}&rdquo;</p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Similarities */}
                {comp.similarities.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-2">Semejanzas</p>
                    <ul className="space-y-2">
                      {comp.similarities.map((s, j) => (
                        <li key={j} className="text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex gap-2">
                            <span className="text-green-400 shrink-0">&#10003;</span>
                            <div>
                              <p>{s.statement}</p>
                              {s.source_fragment && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">&ldquo;{s.source_fragment}&rdquo;</p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Normativa */}
                {comp.articles && comp.articles.trim().length > 0 && (
                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase mb-1">Normativa</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comp.articles}</p>
                  </div>
                )}

                {/* Example */}
                {comp.example && comp.example.trim().length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase mb-1">
                      {comp.example_type === "source" ? "Ejemplo de la fuente" : comp.example_type === "didactic" ? "Ejemplo didáctico generado" : "Ejemplo"}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comp.example}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
