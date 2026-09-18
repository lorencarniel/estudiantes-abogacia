"use client";

import { useRef, useState, useEffect } from "react";

interface SyllabusOption {
  id: string;
  title: string;
}

interface MaterialInputProps {
  onSubmit: (text: string, syllabusId?: string) => void;
  loading: boolean;
  buttonLabel?: string;
  children?: React.ReactNode;
  showSyllabus?: boolean;
}

export default function MaterialInput({
  onSubmit,
  loading,
  buttonLabel = "Generar",
  children,
  showSyllabus = true,
}: MaterialInputProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "file">("text");
  const [fileName, setFileName] = useState("");
  const [fileCharCount, setFileCharCount] = useState(0);
  const [fileReady, setFileReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [syllabi, setSyllabi] = useState<SyllabusOption[]>([]);
  const [selectedSyllabus, setSelectedSyllabus] = useState("");

  useEffect(() => {
    if (showSyllabus) {
      fetch("/api/syllabus")
        .then((r) => r.json())
        .then((data) => {
          if (data.syllabi) setSyllabi(data.syllabi);
        })
        .catch(() => {});
    }
  }, [showSyllabus]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length < 80) return;
    onSubmit(trimmed, selectedSyllabus || undefined);
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
  }

  const charCount = text.trim().length;
  const isValid = charCount >= 80;
  const busy = loading || uploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {children}

      {showSyllabus && syllabi.length > 0 && (
        <div>
          <label htmlFor="syllabus-select" className="block text-sm font-medium text-gray-700 mb-1">
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

      <div className="flex gap-2 border-b border-gray-200 mb-2">
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mode === "text"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          disabled={busy}
        >
          Pegar texto
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            mode === "file"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          disabled={busy}
        >
          Subir archivo
        </button>
      </div>

      {mode === "file" && (
        <div className="space-y-3">
          {fileReady && !uploading ? (
            <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-green-800 font-semibold mb-1">{fileName}</p>
              <p className="text-green-600 text-sm">
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
                  : "border-gray-300 hover:border-primary-400 hover:bg-gray-50"
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
                  <p className="text-gray-700 font-medium mb-1">
                    Arrastrá un archivo o hacé click para seleccionar
                  </p>
                  <p className="text-gray-400 text-sm">PDF, Word (.docx) o texto (.txt) - Máximo 20 MB</p>
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
          <label htmlFor="material-text" className="block text-sm font-medium text-gray-700 mb-1">
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

      <button
        type="submit"
        className="btn-primary w-full sm:w-auto"
        disabled={!isValid || busy}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            {uploading ? "Procesando archivo..." : "Generando..."}
          </span>
        ) : (
          buttonLabel
        )}
      </button>
    </form>
  );
}
