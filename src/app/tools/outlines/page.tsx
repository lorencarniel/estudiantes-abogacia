"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import MaterialInput from "@/components/MaterialInput";
import { useAutoLoadMaterial } from "@/hooks/useAutoLoadMaterial";

interface OutlineSection {
  heading: string;
  note?: string;
  items: Array<{ text: string; note?: string }>;
}

interface OutlineResult {
  title: string;
  sections: OutlineSection[];
}

export default function OutlinesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OutlineResult | null>(null);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
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
    setCollapsed(new Set());

    try {
      const res = await fetch("/api/ai/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, syllabusId }),
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

  function toggleSection(index: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
          <span className="text-3xl">📊</span> Esquemas
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Pegá tu apunte y la IA genera un esquema jerárquico con secciones colapsables.
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
          buttonLabel="Generar esquema"
        />
      </div>
      )}

      {error && (
        <div className="card border-red-200 bg-red-50 mb-8">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{result.title}</h2>

          <div className="space-y-2">
            {result.sections.map((section, i) => (
              <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(i)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-primary-600 font-bold text-sm">
                      {i + 1}.
                    </span>
                    <span className="font-semibold text-gray-900">
                      {section.heading}
                    </span>
                  </div>
                  <span className="text-gray-400 text-lg">
                    {collapsed.has(i) ? "+" : "−"}
                  </span>
                </button>

                {!collapsed.has(i) && (
                  <div className="p-4 space-y-2">
                    {section.note && (
                      <p className="text-gray-600 text-sm italic mb-3">
                        {section.note}
                      </p>
                    )}
                    {section.items.map((item, j) => (
                      <div key={j} className="flex items-start gap-3 pl-2">
                        <span className="text-primary-400 mt-1 text-xs">&#9679;</span>
                        <div>
                          <p className="text-gray-800">{item.text}</p>
                          {item.note && (
                            <p className="text-gray-500 text-sm mt-0.5">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
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
