"use client";

import { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import MaterialInput from "@/components/MaterialInput";
import ConceptMapEditor from "@/components/ConceptMapEditor";

interface MapNode {
  id: string;
  label: string;
  category: "principal" | "secundario" | "definicion" | "ejemplo" | "norma";
}

interface MapEdge {
  source: string;
  target: string;
  label: string;
}

interface ConceptMapData {
  title: string;
  nodes: MapNode[];
  edges: MapEdge[];
}

export default function ConceptMapsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mapData, setMapData] = useState<ConceptMapData | null>(null);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  const handleGenerate = useCallback(async (text: string, syllabusId?: string) => {
    setLoading(true);
    setError("");
    setMapData(null);

    try {
      const res = await fetch("/api/ai/concept-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, syllabusId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al generar el mapa");
        return;
      }

      setMapData(data);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <a href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </a>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🗺️</span>
        <h1 className="text-3xl font-bold text-gray-900">Mapas conceptuales</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Pegá tu apunte y la IA genera un mapa conceptual interactivo que podés editar, reorganizar y exportar.
      </p>

      {!mapData && (
        <div className="card">
          <MaterialInput
            onSubmit={handleGenerate}
            loading={loading}
            buttonLabel="Generar mapa conceptual"
          />
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {mapData && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{mapData.title}</h2>
            <button
              onClick={() => setMapData(null)}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Generar otro mapa
            </button>
          </div>
          <ConceptMapEditor initialData={mapData} />
        </div>
      )}
    </div>
  );
}
