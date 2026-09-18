"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface SyllabusRecord {
  id: string;
  title: string;
  fileName: string | null;
  createdAt: string;
}

export default function SyllabusPage() {
  const { status } = useSession();
  const router = useRouter();
  const [syllabi, setSyllabi] = useState<SyllabusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchSyllabi();
  }, [status]);

  async function fetchSyllabi() {
    try {
      const res = await fetch("/api/syllabus");
      const data = await res.json();
      if (data.syllabi) setSyllabi(data.syllabi);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(text: string) {
    if (!title.trim()) {
      setError("Escribí un nombre para el programa (ej: Derecho Civil I)");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(
        data.truncated
          ? `Programa "${data.title}" guardado (recortado a 10.000 caracteres)`
          : `Programa "${data.title}" guardado correctamente`
      );
      setTitle("");
      setShowForm(false);
      fetchSyllabi();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el programa "${name}"?`)) return;

    try {
      const res = await fetch(`/api/syllabus?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setSyllabi((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("No se pudo eliminar el programa");
    }
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
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <span className="text-3xl">📋</span> Programas de materias
        </h1>
        <p className="text-gray-600 mt-2">
          Subí el programa oficial de tu materia para que la IA siga las unidades y temas al generar contenido.
        </p>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="card border-green-200 bg-green-50 mb-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}
          className="btn-primary mb-6"
        >
          + Agregar programa
        </button>
      ) : (
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Nuevo programa</h2>

          <div className="mb-4">
            <label htmlFor="syllabus-title" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la materia
            </label>
            <input
              id="syllabus-title"
              type="text"
              className="input-field"
              placeholder="Ej: Derecho Civil I, Derecho Penal - Parte General"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              maxLength={100}
            />
          </div>

          <MaterialInput
            onSubmit={handleSave}
            loading={saving}
            buttonLabel="Guardar programa"
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
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Mis programas ({syllabi.length})
        </h2>

        {syllabi.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500">
              No tenés programas guardados. Subí el programa oficial de tu materia
              para que la IA organice el contenido según las unidades.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {syllabi.map((s) => (
              <div key={s.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-400">
                    {s.fileName && `${s.fileName} · `}
                    {new Date(s.createdAt).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(s.id, s.title)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
