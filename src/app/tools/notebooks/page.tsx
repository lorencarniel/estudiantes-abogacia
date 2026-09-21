"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface NotebookSummary {
  id: string;
  name: string;
  color: string;
  materialCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MaterialItem {
  id: string;
  title: string;
  fileName: string | null;
  charCount: number;
  createdAt: string;
}

interface NotebookDetail {
  id: string;
  name: string;
  color: string;
  materials: MaterialItem[];
}

const COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

export default function NotebooksPage() {
  const { status } = useSession();
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<NotebookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotebook, setSelectedNotebook] = useState<NotebookDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [unassigned, setUnassigned] = useState<MaterialItem[]>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchNotebooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notebooks");
      const data = await res.json();
      if (data.notebooks) setNotebooks(data.notebooks);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchNotebooks();
  }, [status, fetchNotebooks]);

  async function openNotebook(id: string) {
    try {
      const res = await fetch(`/api/notebooks/${id}`);
      const data = await res.json();
      if (data.notebook) setSelectedNotebook(data.notebook);
    } catch {}
  }

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear");
      } else {
        setShowCreate(false);
        setNewName("");
        await fetchNotebooks();
      }
    } catch {
      setError("Error de conexión");
    }
    setCreating(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el cuaderno "${name}"? Los apuntes no se borran.`)) return;
    try {
      await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
      if (selectedNotebook?.id === id) setSelectedNotebook(null);
      await fetchNotebooks();
    } catch {}
  }

  async function fetchUnassigned() {
    setLoadingUnassigned(true);
    try {
      const res = await fetch("/api/materials");
      const data = await res.json();
      if (data.materials) {
        const notebookMaterialIds = new Set(selectedNotebook?.materials.map((m) => m.id) || []);
        setUnassigned(data.materials.filter((m: MaterialItem) => !notebookMaterialIds.has(m.id)));
      }
    } catch {}
    setLoadingUnassigned(false);
  }

  async function assignMaterial(materialId: string) {
    if (!selectedNotebook) return;
    try {
      const res = await fetch("/api/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: materialId, notebookId: selectedNotebook.id }),
      });
      if (res.ok) {
        await openNotebook(selectedNotebook.id);
        await fetchNotebooks();
        await fetchUnassigned();
      }
    } catch {}
  }

  async function unassignMaterial(materialId: string) {
    try {
      const res = await fetch("/api/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: materialId, notebookId: null }),
      });
      if (res.ok && selectedNotebook) {
        await openNotebook(selectedNotebook.id);
        await fetchNotebooks();
      }
    } catch {}
  }

  async function handleAddNewMaterial(text: string) {
    if (!selectedNotebook) return;
    const title = text.substring(0, 60).trim() + "...";
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: text,
          notebookId: selectedNotebook.id,
        }),
      });
      if (res.ok) {
        setShowAddMaterial(false);
        await openNotebook(selectedNotebook.id);
        await fetchNotebooks();
      }
    } catch {}
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/dashboard" className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block">
        &larr; Volver al dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📓</span>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mis cuadernos</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Organizá tus apuntes por materia
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2 px-4">
          + Nuevo cuaderno
        </button>
      </div>

      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Nuevo cuaderno</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="nb-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre de la materia
              </label>
              <input
                id="nb-name"
                type="text"
                className="input-field"
                placeholder="Ej: Derecho Penal"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      newColor === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={!newName.trim() || creating} className="btn-primary text-sm py-2 px-4">
                {creating ? "Creando..." : "Crear cuaderno"}
              </button>
              <button onClick={() => { setShowCreate(false); setNewName(""); setError(""); }} className="btn-secondary text-sm py-2 px-4">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={selectedNotebook ? "lg:col-span-1" : "lg:col-span-3"}>
          {notebooks.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📓</p>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No tenés cuadernos todavía</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Creá uno para empezar a organizar tus apuntes por materia
              </p>
            </div>
          ) : (
            <div className={`grid gap-3 ${selectedNotebook ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {notebooks.map((nb) => (
                <div
                  key={nb.id}
                  onClick={() => openNotebook(nb.id)}
                  className={`card cursor-pointer hover:shadow-md transition-all border-l-4 ${
                    selectedNotebook?.id === nb.id ? "ring-2 ring-primary-500" : ""
                  }`}
                  style={{ borderLeftColor: nb.color }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{nb.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {nb.materialCount} apunte{nb.materialCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(nb.id, nb.name); }}
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

        {selectedNotebook && (
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedNotebook.color }} />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedNotebook.name}</h2>
                </div>
                <button
                  onClick={() => setSelectedNotebook(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setShowAddMaterial(false); fetchUnassigned(); }}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  + Agregar apunte existente
                </button>
                <button
                  onClick={() => setShowAddMaterial(true)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  + Subir apunte nuevo
                </button>
                <Link
                  href={`/tools/chat?notebook=${selectedNotebook.id}`}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  💬 Chatear con este cuaderno
                </Link>
              </div>

              {showAddMaterial && (
                <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
                    Agregar apunte al cuaderno
                  </h3>
                  <MaterialInput
                    onSubmit={handleAddNewMaterial}
                    loading={false}
                    buttonLabel="Guardar en cuaderno"
                    showSyllabus={false}
                  />
                </div>
              )}

              {!showAddMaterial && unassigned.length > 0 && (
                <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                    Apuntes disponibles
                  </h3>
                  {loadingUnassigned ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {unassigned.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.title}</p>
                            <p className="text-xs text-gray-400">{m.charCount.toLocaleString()} chars</p>
                          </div>
                          <button
                            onClick={() => assignMaterial(m.id)}
                            className="text-primary-600 hover:text-primary-800 text-xs font-medium shrink-0 ml-2"
                          >
                            + Agregar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedNotebook.materials.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-3xl mb-2">📂</p>
                  <p className="text-sm font-medium">Este cuaderno está vacío</p>
                  <p className="text-xs text-gray-400 mt-1">Agregá apuntes para empezar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {selectedNotebook.materials.length} apunte{selectedNotebook.materials.length !== 1 ? "s" : ""} &middot;{" "}
                    {selectedNotebook.materials.reduce((acc, m) => acc + m.charCount, 0).toLocaleString()} caracteres total
                  </p>
                  {selectedNotebook.materials.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{m.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          {m.fileName && <span>{m.fileName}</span>}
                          <span>{m.charCount.toLocaleString()} chars</span>
                        </div>
                      </div>
                      <button
                        onClick={() => unassignMaterial(m.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0"
                        title="Quitar del cuaderno"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
