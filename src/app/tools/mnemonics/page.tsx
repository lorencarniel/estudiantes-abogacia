"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MaterialInput from "@/components/MaterialInput";

interface Mnemonic {
  concept: string;
  technique: string;
  mnemonic: string;
  explanation: string;
}

interface MnemonicResult {
  title: string;
  mnemonics: Mnemonic[];
}

const TECHNIQUE_ICONS: Record<string, string> = {
  "Acrónimo": "🔤",
  "Frase": "💬",
  "Asociación visual": "🎨",
  "Historia": "📖",
  "Rima": "🎵",
};

export default function MnemonicsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MnemonicResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  async function handleGenerate(text: string) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/mnemonic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al generar");
      }

      const data: MnemonicResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
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
      <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        🧠 Generador de mnemotécnicos
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Creá reglas mnemotécnicas para memorizar conceptos difíciles.
      </p>

      {!result && !loading && (
        <MaterialInput
          onSubmit={handleGenerate}
          loading={loading}
          buttonLabel="Generar mnemotécnicos"
        />
      )}

      {loading && (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Generando mnemotécnicos...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{result.title}</h2>
            <button onClick={() => setResult(null)} className="btn-secondary text-sm py-2 px-4">
              Nuevo texto
            </button>
          </div>

          <div className="space-y-4">
            {result.mnemonics.map((m, i) => (
              <div key={i} className="card">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{TECHNIQUE_ICONS[m.technique] || "💡"}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 dark:text-white">{m.concept}</h3>
                      <span className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full">
                        {m.technique}
                      </span>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-2">
                      <p className="text-amber-900 dark:text-amber-200 font-medium">{m.mnemonic}</p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{m.explanation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
