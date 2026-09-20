"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface SavedMaterial {
  id: string;
  title: string;
  fileName: string | null;
  charCount: number;
  createdAt: string;
}

export default function MaterialsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [materials, setMaterials] = useState<SavedMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchMaterials();
  }, [status]);

  async function fetchMaterials() {
    try {
      const res = await fetch("/api/materials");
      const data = await res.json();
      if (data.materials) setMaterials(data.materials);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  async function handleSave(text: string) {
    if (!title.trim()) {
      setError("Ingresá un título para el apunte");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
      } else {
        setMaterials((prev) => [data, ...prev]);
        setShowForm(false);
        setTitle("");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este apunte?")) return;
    await fetch(`/api/materials?id=${id}`, { method: "DELETE" });
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  if (status === "loading" || loading) {
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
          <span className="text-3xl">📂</span> Mis apuntes
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Guardá tus apuntes para reutilizarlos en cualquier herramienta sin tener que volver a subirlos.
        </p>
      </div>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary mb-6"
        >
          + Agregar apunte
        </button>
      )}

      {error && (
        <div className="card border-red-200 bg-red-50 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="card mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Nuevo apunte</h2>

          <div className="mb-4">
            <label htmlFor="material-title" className="block text-sm font-medium text-gray-700 mb-1">
              Título del apunte
            </label>
            <input
              id="material-title"
              type="text"
              className="input-field"
              placeholder="Ej: Derecho Civil I - Obligaciones"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              maxLength={100}
            />
          </div>

          <MaterialInput
            onSubmit={handleSave}
            loading={saving}
            buttonLabel="Guardar apunte"
            showSyllabus={false}
          />

          <button
            type="button"
            onClick={() => { setShowForm(false); setError(""); }}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Apuntes guardados ({materials.length})
        </h2>

        {materials.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">📂</p>
            <p className="text-gray-500">
              No tenés apuntes guardados. Subí un archivo o pegá texto para guardarlo y reutilizarlo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <div key={m.id} className="card hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{m.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {m.fileName && <span>{m.fileName}</span>}
                      <span>{m.charCount.toLocaleString()} caracteres</span>
                      <span>&middot;</span>
                      <span>{new Date(m.createdAt).toLocaleDateString("es-AR")}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
