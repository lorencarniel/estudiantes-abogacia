"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MaterialInput from "@/components/MaterialInput";

interface GlossaryTerm {
  term: string;
  definition: string;
  category: string;
}

export default function GlossaryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  async function handleGenerate(text: string, _syllabusId?: string, options?: { simpleMode?: boolean }) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, simpleMode: options?.simpleMode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al generar");
      }

      const data = await res.json();
      setTerms(prev => {
        const existing = new Set(prev.map(t => t.term.toLowerCase()));
        const newTerms = (data.terms || []).filter((t: GlossaryTerm) => !existing.has(t.term.toLowerCase()));
        return [...prev, ...newTerms].sort((a, b) => a.term.localeCompare(b.term));
      });
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const filtered = search
    ? terms.filter(t =>
        t.term.toLowerCase().includes(search.toLowerCase()) ||
        t.definition.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
      )
    : terms;

  const categories = Array.from(new Set(terms.map(t => t.category))).sort();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        📚 Glosario jurídico
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Extraé automáticamente los términos clave de tus apuntes y construí tu glosario personal.
      </p>

      <MaterialInput
        onSubmit={handleGenerate}
        loading={loading}
        buttonLabel={terms.length > 0 ? "Agregar más términos" : "Extraer glosario"}
        showSimpleMode
      />

      {loading && (
        <div className="card text-center py-8 mt-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Extrayendo términos...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {generated && terms.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{terms.length} términos en tu glosario</p>
            <div className="flex gap-2">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSearch(cat)}
                  className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full hover:bg-primary-200">
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            placeholder="Buscar término..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field mb-4"
          />

          <div className="space-y-3">
            {filtered.map((term, i) => (
              <div key={i} className="card py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 dark:text-white">{term.term}</h3>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {term.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{term.definition}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && search && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No se encontraron términos para &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
