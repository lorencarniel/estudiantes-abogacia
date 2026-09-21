"use client";

import { useState } from "react";

const SUBJECTS = [
  "Derecho Civil",
  "Derecho Penal",
  "Derecho Constitucional",
  "Derecho Comercial",
  "Derecho Laboral",
  "Derecho Administrativo",
  "Derecho Procesal Civil",
  "Derecho Procesal Penal",
  "Derecho Internacional Público",
  "Derecho Internacional Privado",
  "Derechos Reales",
  "Obligaciones",
  "Contratos",
  "Familia y Sucesiones",
  "Derecho Tributario",
  "Filosofía del Derecho",
];

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleSubject(s: string) {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: selected,
          onboardingDone: true,
        }),
      });
    } catch {}
    setSaving(false);
    onComplete();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto">
        {step === 0 && (
          <div className="text-center">
            <p className="text-5xl mb-4">🎓</p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Bienvenido a EstudioJurídico
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Tu plataforma de estudio con IA para Abogacía. Vamos a configurar
              tu experiencia en 2 pasos.
            </p>
            <button
              onClick={() => setStep(1)}
              className="btn-primary w-full sm:w-auto"
            >
              Empezar
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              ¿Qué materias estás cursando?
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Seleccioná las que quieras (podés cambiarlas después en tu perfil)
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSubject(s)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                    selected.includes(s)
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="btn-secondary text-sm py-2 px-4"
              >
                Atrás
              </button>
              <button
                onClick={() => setStep(2)}
                className="btn-primary text-sm py-2 px-4"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Cómo usar la plataforma
            </h2>
            <div className="space-y-4 mb-6">
              <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <span className="text-2xl shrink-0">📄</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    Subí tu material
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    Podés pegar texto, subir PDFs o archivos Word
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <span className="text-2xl shrink-0">🤖</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    La IA genera todo
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    Resúmenes, quizzes, mapas, flashcards y más
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <span className="text-2xl shrink-0">📊</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    Seguí tu progreso
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    Ganá XP, mantené tu racha y mejorá tus áreas débiles
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="btn-primary w-full"
            >
              {saving ? "Guardando..." : "Empezar a estudiar"}
            </button>
          </div>
        )}

        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step
                  ? "bg-primary-600"
                  : "bg-gray-200 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
