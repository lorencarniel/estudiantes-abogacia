"use client";

import { useRef, useState, useEffect } from "react";

interface SyllabusOption {
  id: string;
  title: string;
}

interface SavedMaterial {
  id: string;
  title: string;
  fileName: string | null;
  charCount: number;
  createdAt: string;
}

interface NotebookOption {
  id: string;
  name: string;
  color: string;
  materialCount: number;
}

interface MaterialInputProps {
  onSubmit: (text: string, syllabusId?: string, options?: { simpleMode?: boolean }) => void;
  loading: boolean;
  buttonLabel?: string;
  children?: React.ReactNode;
  showSyllabus?: boolean;
  showSimpleMode?: boolean;
}

export default function MaterialInput({
  onSubmit,
  loading,
  buttonLabel = "Generar",
  children,
  showSyllabus = true,
  showSimpleMode = false,
}: MaterialInputProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "file" | "saved" | "notebook">("text");
  const [fileName, setFileName] = useState("");
  const [fileCharCount, setFileCharCount] = useState(0);
  const [fileReady, setFileReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [syllabi, setSyllabi] = useState<SyllabusOption[]>([]);
  const [selectedSyllabus, setSelectedSyllabus] = useState("");

  const [materials, setMaterials] = useState<SavedMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");

  const [notebooks, setNotebooks] = useState<NotebookOption[]>([]);
  const [loadingNotebook, setLoadingNotebook] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [simpleMode, setSimpleMode] = useState(false);

  useEffect(() => {
    try {
      const cross = sessionStorage.getItem("crossToolText");
      if (cross) {
        sessionStorage.removeItem("crossToolText");
        const autoSubmit = sessionStorage.getItem("crossToolAutoSubmit");
        sessionStorage.removeItem("crossToolAutoSubmit");
        setText(cross);
        setFileName("Material de otra herramienta");
        setFileCharCount(cross.length);
        setFileReady(true);
        if (autoSubmit && cross.trim().length >= 80) {
          setTimeout(() => onSubmit(cross.trim()), 100);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (showSyllabus) {
      fetch("/api/syllabus")
        .then((r) => r.json())
        .then((data) => {
          if (data.syllabi) setSyllabi(data.syllabi);
        })
        .catch(() => {});
    }
    fetch("/api/notebooks")
      .then((r) => r.json())
      .then((data) => {
        if (data.notebooks) {
          setNotebooks(data.notebooks.filter((n: NotebookOption) => n.materialCount > 0));
        }
      })
      .catch(() => {});
  }, [showSyllabus]);

  async function loadNotebook(id: string) {
    setLoadingNotebook(true);
    setSelectedNotebook(id);
    try {
      const res = await fetch(`/api/notebooks/${id}`);
      const data = await res.json();
      if (data.notebook && data.notebook.materials.length > 0) {
        const combined = data.notebook.materials
          .map((m: { title: string; content: string }) => `--- ${m.title} ---\n${m.content}`)
          .join("\n\n");
        setText(combined);
        setFileName(`📓 ${data.notebook.name}`);
        setFileCharCount(combined.length);
        setFileReady(true);
      }
    } catch {
      setUploadError("Error al cargar el cuaderno");
    } finally {
      setLoadingNotebook(false);
    }
  }

  function fetchMaterials() {
    setLoadingMaterials(true);
    fetch("/api/materials")
      .then((r) => r.json())
      .then((data) => {
        if (data.materials) setMaterials(data.materials);
      })
      .catch(() => {})
      .finally(() => setLoadingMaterials(false));
  }

  useEffect(() => {
    if (mode === "saved") fetchMaterials();
  }, [mode]);

  async function loadMaterial(id: string) {
    setLoadingContent(true);
    setSelectedMaterial(id);
    try {
      const res = await fetch(`/api/materials/${id}`);
      const data = await res.json();
      if (res.ok && data.content) {
        setText(data.content);
        setFileName(data.fileName || data.title);
        setFileCharCount(data.charCount);
        setFileReady(true);
      }
    } catch {
      setUploadError("Error al cargar el apunte");
    } finally {
      setLoadingContent(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length < 80) return;
    onSubmit(trimmed, selectedSyllabus || undefined, simpleMode ? { simpleMode: true } : undefined);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploading(true);
    setFileName(file.name);
    setFileReady(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ai/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Error al procesar el archivo");
        setFileName("");
      } else {
        setText(data.text);
        setFileCharCount(data.text.length);
        setFileReady(true);
        if (data.truncated) {
          setUploadError(data.message);
        }
      }
    } catch {
      setUploadError("Error de conexión al subir el archivo");
      setFileName("");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleRemoveFile() {
    setFileName("");
    setFileReady(false);
    setFileCharCount(0);
    setText("");
    setUploadError("");
    setSelectedMaterial(null);
    setSelectedNotebook(null);
    setSaveSuccess("");
  }

  async function handleSaveMaterial() {
    if (!saveTitle.trim() || text.trim().length < 80) return;
    setSaving(true);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: saveTitle.trim(),
          content: text.trim(),
          fileName: fileName || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveSuccess("Apunte guardado");
        setShowSaveForm(false);
        setSaveTitle("");
      } else {
        setUploadError(data.error || "Error al guardar");
      }
    } catch {
      setUploadError("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  }

  const charCount = text.trim().length;
  const isValid = charCount >= 80;
  const busy = loading || uploading || loadingContent || loadingNotebook;

  const tabs: { key: "text" | "file" | "saved" | "notebook"; label: string }[] = [
    { key: "text", label: "Pegar texto" },
    { key: "file", label: "Subir archivo" },
    { key: "saved", label: "Mis apuntes" },
    ...(notebooks.length > 0 ? [{ key: "notebook" as const, label: "📓 Cuadernos" }] : []),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {children}

      {showSyllabus && syllabi.length > 0 && (
        <div>
          <label htmlFor="syllabus-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Programa de la materia (opcional)
          </label>
          <select
            id="syllabus-select"
            className="input-field"
            value={selectedSyllabus}
            onChange={(e) => setSelectedSyllabus(e.target.value)}
            disabled={busy}
          >
            <option value="">Sin programa</option>
            {syllabi.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Si seleccionás un programa, la IA organizará el contenido según sus unidades
          </p>
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMode(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === tab.key
                ? "border-primary-600 text-primary-700 dark:text-primary-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            disabled={busy}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "saved" && (
        <div className="space-y-3">
          {loadingMaterials ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
            </div>
          ) : selectedMaterial && fileReady ? (
            <div className="border-2 border-green-300 bg-green-50 dark:bg-green-900/30 dark:border-green-700 rounded-lg p-6 text-center">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-green-800 dark:text-green-300 font-semibold mb-1">{fileName}</p>
              <p className="text-green-600 dark:text-green-400 text-sm">
                Apunte cargado ({fileCharCount.toLocaleString()} caracteres)
              </p>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Cambiar apunte
              </button>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-3xl mb-2">📂</p>
              <p className="text-sm">No tenés apuntes guardados.</p>
              <p className="text-xs text-gray-400 mt-1">
                Subí un archivo o pegá texto y guardalo para reutilizarlo.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {materials.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => loadMaterial(m.id)}
                  disabled={loadingContent}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{m.title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    {m.fileName && <span>{m.fileName}</span>}
                    <span>{m.charCount.toLocaleString()} chars</span>
                    <span>{new Date(m.createdAt).toLocaleDateString("es-AR")}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "notebook" && (
        <div className="space-y-3">
          {selectedNotebook && fileReady ? (
            <div className="border-2 border-green-300 bg-green-50 dark:bg-green-900/30 dark:border-green-700 rounded-lg p-6 text-center">
              <p className="text-4xl mb-3">📓</p>
              <p className="text-green-800 dark:text-green-300 font-semibold mb-1">{fileName}</p>
              <p className="text-green-600 dark:text-green-400 text-sm">
                Cuaderno cargado ({fileCharCount.toLocaleString()} caracteres)
              </p>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Cambiar cuaderno
              </button>
            </div>
          ) : loadingNotebook ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notebooks.map((nb) => (
                <button
                  key={nb.id}
                  type="button"
                  onClick={() => loadNotebook(nb.id)}
                  className="text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
                  style={{ borderLeftColor: nb.color, borderLeftWidth: 4 }}
                >
                  <p className="font-bold text-gray-900 dark:text-white">{nb.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {nb.materialCount} apunte{nb.materialCount !== 1 ? "s" : ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "file" && (
        <div className="space-y-3">
          {fileReady && !uploading ? (
            <div className="border-2 border-green-300 bg-green-50 dark:bg-green-900/30 dark:border-green-700 rounded-lg p-6 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-green-800 dark:text-green-300 font-semibold mb-1">{fileName}</p>
              <p className="text-green-600 dark:text-green-400 text-sm">
                Archivo listo ({fileCharCount.toLocaleString()} caracteres extraídos)
              </p>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Quitar archivo
              </button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                uploading
                  ? "border-primary-300 bg-primary-50"
                  : "border-gray-300 hover:border-primary-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                  <p className="text-primary-700 font-medium">
                    Procesando {fileName}...
                  </p>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <p className="text-4xl mb-3">📎</p>
                  <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Arrastrá un archivo o hacé click para seleccionar
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">PDF, Word (.docx) o texto (.txt) - Máximo 20 MB</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleFileUpload}
                    className="sr-only"
                    disabled={busy}
                  />
                </label>
              )}
            </div>
          )}

          {uploadError && (
            <p className="text-red-600 text-sm font-medium">{uploadError}</p>
          )}
        </div>
      )}

      {mode === "text" && (
        <div>
          <label htmlFor="material-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pegá tu apunte o texto de estudio
          </label>
          <textarea
            id="material-text"
            rows={8}
            maxLength={100_000}
            className="input-field font-mono text-sm"
            placeholder="Pegá acá tus apuntes, doctrina, artículos del código, fallos... (mínimo 80 caracteres)"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFileReady(false);
              setFileName("");
              setSaveSuccess("");
            }}
            disabled={busy}
          />
          <div className="flex justify-between mt-1">
            <p className={`text-xs ${isValid ? "text-green-600" : "text-gray-400"}`}>
              {charCount.toLocaleString()} caracteres{" "}
              {!isValid && charCount > 0 && `(faltan ${80 - charCount})`}
            </p>
            <p className="text-xs text-gray-400">Máximo 100.000 caracteres</p>
          </div>
        </div>
      )}

      {isValid && mode !== "saved" && !saveSuccess && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
          {showSaveForm ? (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="save-title" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Nombre del apunte
                </label>
                <input
                  id="save-title"
                  type="text"
                  className="input-field text-sm"
                  placeholder="Ej: Derecho Civil - Obligaciones"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  maxLength={100}
                  disabled={saving}
                />
              </div>
              <button
                type="button"
                onClick={handleSaveMaterial}
                disabled={saving || !saveTitle.trim()}
                className="btn-primary text-sm py-2 px-4 whitespace-nowrap"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => { setShowSaveForm(false); setSaveTitle(""); }}
                className="text-gray-400 hover:text-gray-600 text-sm py-2 px-2"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSaveForm(true)}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              💾 Guardar apunte para reutilizar
            </button>
          )}
        </div>
      )}

      {saveSuccess && (
        <p className="text-green-600 text-sm font-medium">✓ {saveSuccess}</p>
      )}

      {uploadError && mode !== "file" && (
        <p className="text-red-600 text-sm font-medium">{uploadError}</p>
      )}

      {showSimpleMode && isValid && (
        <button
          type="button"
          onClick={() => setSimpleMode(!simpleMode)}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
            simpleMode
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          💡 {simpleMode ? "Modo fácil activado — explicaciones simples con ejemplos" : "Activar modo fácil"}
        </button>
      )}

      <button
        type="submit"
        className="btn-primary w-full sm:w-auto"
        disabled={!isValid || busy}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            {uploading ? "Procesando archivo..." : loadingContent ? "Cargando apunte..." : "Generando..."}
          </span>
        ) : (
          buttonLabel
        )}
      </button>
    </form>
  );
}
