"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
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

interface SyllabusUnit {
  number: number;
  title: string;
  topics: string[];
}

interface UnitOutlineResult {
  unitNumber: number;
  unitTitle: string;
  sections: OutlineSection[];
  missingTopics: string[];
}

export default function OutlinesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OutlineResult | null>(null);
  const [unitResults, setUnitResults] = useState<UnitOutlineResult[]>([]);
  const [error, setError] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceSyllabusId, setSourceSyllabusId] = useState<string | undefined>();
  const [simpleMode, setSimpleMode] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedUnits, setCollapsedUnits] = useState<Set<number>>(new Set());
  const [unitProgress, setUnitProgress] = useState<{ total: number; current: number; currentTitle: string } | null>(null);
  const { text: autoText, loading: autoLoading, subjectName } = useAutoLoadMaterial();
  const autoTriggered = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (autoText && !autoTriggered.current && !loading && !result && unitResults.length === 0) {
      autoTriggered.current = true;
      handleGenerate(autoText);
    }
  }, [autoText]);

  const handleGenerate = useCallback(async (text: string, syllabusId?: string, options?: { simpleMode?: boolean }) => {
    const useSimple = options?.simpleMode ?? simpleMode;
    setLoading(true);
    setError("");
    setResult(null);
    setUnitResults([]);
    setSourceText(text);
    setSourceSyllabusId(syllabusId);
    setSimpleMode(useSimple);
    setCollapsed(new Set());
    setCollapsedUnits(new Set());
    setUnitProgress(null);

    try {
      if (syllabusId) {
        const parseRes = await fetch("/api/ai/outline/parse-syllabus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ syllabusId }),
        });
        const parseData = await parseRes.json();
        if (!parseRes.ok) throw new Error(parseData.error);

        const units: SyllabusUnit[] = parseData.units || [];
        if (units.length === 0) throw new Error("No se encontraron unidades en el programa");

        setUnitProgress({ total: units.length, current: 0, currentTitle: units[0].title });
        const results: UnitOutlineResult[] = [];

        for (let i = 0; i < units.length; i++) {
          const unit = units[i];
          setUnitProgress({ total: units.length, current: i, currentTitle: unit.title });

          const unitRes = await fetch("/api/ai/outline/unit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              unitTitle: unit.title,
              unitTopics: unit.topics,
              simpleMode: useSimple,
            }),
          });
          const unitData = await unitRes.json();

          if (unitRes.ok) {
            results.push({
              unitNumber: unit.number,
              unitTitle: unit.title,
              sections: unitData.sections || [],
              missingTopics: unitData.missing_topics || [],
            });
            setUnitResults([...results]);
          } else {
            results.push({
              unitNumber: unit.number,
              unitTitle: unit.title,
              sections: [],
              missingTopics: [`Error al generar: ${unitData.error}`],
            });
            setUnitResults([...results]);
          }
        }

        setUnitProgress(null);
      } else {
        const res = await fetch("/api/ai/outline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, syllabusId, simpleMode: useSimple }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar");
    } finally {
      setLoading(false);
      setUnitProgress(null);
    }
  }, [simpleMode]);

  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleUnit(unitNum: number) {
    setCollapsedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitNum)) next.delete(unitNum);
      else next.add(unitNum);
      return next;
    });
  }

  function handleReset() {
    setResult(null);
    setUnitResults([]);
    setSourceText("");
    setSourceSyllabusId(undefined);
    setError("");
  }

  const hasResults = result || unitResults.length > 0;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  function renderSections(sections: OutlineSection[], keyPrefix: string) {
    return (
      <div className="space-y-2">
        {sections.map((section, i) => {
          const key = `${keyPrefix}-${i}`;
          return (
            <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-primary-600 font-bold text-sm">{i + 1}.</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{section.heading}</span>
                </div>
                <span className="text-gray-400 text-lg">{collapsed.has(key) ? "+" : "−"}</span>
              </button>
              {!collapsed.has(key) && (
                <div className="p-4 space-y-2">
                  {section.note && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm italic mb-3">{section.note}</p>
                  )}
                  {section.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-3 pl-2">
                      <span className="text-primary-400 mt-1 text-xs">&#9679;</span>
                      <div>
                        <p className="text-gray-800 dark:text-gray-200">{item.text}</p>
                        {item.note && (
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{item.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
          Pegá tu apunte y la IA genera un esquema jerárquico. Si seleccionás un programa, genera un esquema por unidad.
        </p>
      </div>

      {(autoLoading || (autoText && loading && !hasResults)) && !unitProgress && (
        <div className="card text-center py-12 mb-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando apunte de {subjectName}...</p>
        </div>
      )}

      {unitProgress && (
        <div className="card mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
            <p className="text-gray-900 dark:text-white font-medium">
              Generando unidad {unitProgress.current + 1} de {unitProgress.total}
            </p>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{unitProgress.currentTitle}</p>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${((unitProgress.current) / unitProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!autoLoading && !(autoText && loading && !hasResults) && !hasResults && !unitProgress && (
        <div className="card mb-8">
          <MaterialInput
            onSubmit={handleGenerate}
            loading={loading}
            buttonLabel="Generar esquema"
            showSimpleMode
          />
        </div>
      )}

      {error && (
        <div className="card border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 mb-8">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{result.title}</h2>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                const next = !simpleMode;
                setSimpleMode(next);
                handleGenerate(sourceText, sourceSyllabusId, { simpleMode: next });
              }}
              disabled={loading}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                simpleMode
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {simpleMode ? "💡 Modo fácil ON" : "💡 Activar modo fácil"}
            </button>
            <button onClick={handleReset} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Nuevo esquema
            </button>
          </div>
          {renderSections(result.sections, "s")}

          {sourceText && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mt-6">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Usar este material en otra herramienta</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { sessionStorage.setItem("crossToolText", sourceText); sessionStorage.setItem("crossToolAutoSubmit", "1"); router.push("/tools/highlighter"); }} className="text-sm px-4 py-2 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 font-medium transition-colors">🖍️ Resaltar</button>
                <button onClick={() => { sessionStorage.setItem("crossToolText", sourceText); sessionStorage.setItem("crossToolAutoSubmit", "1"); router.push("/tools/summaries"); }} className="text-sm px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 font-medium transition-colors">📄 Resumen</button>
                <button onClick={() => { sessionStorage.setItem("crossToolText", sourceText); sessionStorage.setItem("crossToolAutoSubmit", "1"); router.push("/tools/flashcards"); }} className="text-sm px-4 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 font-medium transition-colors">🃏 Flashcards</button>
                <button onClick={() => { sessionStorage.setItem("crossToolText", sourceText); sessionStorage.setItem("crossToolAutoSubmit", "1"); router.push("/tools/quizzes"); }} className="text-sm px-4 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 font-medium transition-colors">✅ Quiz</button>
              </div>
            </div>
          )}
        </div>
      )}

      {unitResults.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => {
                const next = !simpleMode;
                setSimpleMode(next);
                handleGenerate(sourceText, sourceSyllabusId, { simpleMode: next });
              }}
              disabled={loading}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                simpleMode
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {simpleMode ? "💡 Modo fácil ON" : "💡 Activar modo fácil"}
            </button>
            <button onClick={handleReset} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Nuevo esquema
            </button>
          </div>

          {unitResults.map((unit) => (
            <div key={unit.unitNumber} className="card">
              <button
                onClick={() => toggleUnit(unit.unitNumber)}
                className="w-full flex items-center justify-between mb-4 text-left"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Unidad {unit.unitNumber}: {unit.unitTitle}
                </h2>
                <span className="text-gray-400 text-xl ml-3 shrink-0">
                  {collapsedUnits.has(unit.unitNumber) ? "+" : "−"}
                </span>
              </button>

              {!collapsedUnits.has(unit.unitNumber) && (
                <>
                  {unit.sections.length > 0 ? (
                    renderSections(unit.sections, `u${unit.unitNumber}`)
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                      No se encontró contenido para esta unidad en el material.
                    </p>
                  )}

                  {unit.missingTopics.length > 0 && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">
                        Temas del programa no encontrados en el material:
                      </p>
                      <ul className="space-y-1">
                        {unit.missingTopics.map((topic, i) => (
                          <li key={i} className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{topic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {sourceText && !loading && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Usar este material en otra herramienta</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { sessionStorage.setItem("crossToolText", sourceText); sessionStorage.setItem("crossToolAutoSubmit", "1"); router.push("/tools/highlighter"); }} className="text-sm px-4 py-2 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 font-medium transition-colors">🖍️ Resaltar</button>
                <button onClick={() => { sessionStorage.setItem("crossToolText", sourceText); sessionStorage.setItem("crossToolAutoSubmit", "1"); router.push("/tools/summaries"); }} className="text-sm px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 font-medium transition-colors">📄 Resumen</button>
                <button onClick={() => { sessionStorage.setItem("crossToolText", sourceText); sessionStorage.setItem("crossToolAutoSubmit", "1"); router.push("/tools/flashcards"); }} className="text-sm px-4 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 font-medium transition-colors">🃏 Flashcards</button>
                <button onClick={() => { sessionStorage.setItem("crossToolText", sourceText); sessionStorage.setItem("crossToolAutoSubmit", "1"); router.push("/tools/quizzes"); }} className="text-sm px-4 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 font-medium transition-colors">✅ Quiz</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
