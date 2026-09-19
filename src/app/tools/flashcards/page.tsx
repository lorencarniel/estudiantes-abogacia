"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";
import { useAutoLoadMaterial } from "@/hooks/useAutoLoadMaterial";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReview: string;
}

interface Deck {
  id: string;
  title: string;
  createdAt: string;
  flashcards: Flashcard[];
}

const QUALITY_LABELS = [
  { value: 0, label: "No la sé", color: "bg-red-500 hover:bg-red-600" },
  { value: 1, label: "Muy mal", color: "bg-red-400 hover:bg-red-500" },
  { value: 2, label: "Mal", color: "bg-orange-400 hover:bg-orange-500" },
  { value: 3, label: "Regular", color: "bg-yellow-400 hover:bg-yellow-500" },
  { value: 4, label: "Bien", color: "bg-green-400 hover:bg-green-500" },
  { value: 5, label: "Perfecto", color: "bg-green-600 hover:bg-green-700" },
];

export default function FlashcardsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [studyDeck, setStudyDeck] = useState<Deck | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [studyComplete, setStudyComplete] = useState(false);
  const [studyStats, setStudyStats] = useState({ total: 0, good: 0 });
  const { text: autoText, loading: autoLoading, subjectName } = useAutoLoadMaterial();
  const autoTriggered = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (autoText && !autoTriggered.current && !loading) {
      autoTriggered.current = true;
      handleGenerate(autoText);
    }
  }, [autoText]);

  const fetchDecks = useCallback(async () => {
    try {
      const res = await fetch("/api/flashcards");
      const data = await res.json();
      if (data.decks) setDecks(data.decks);
    } catch { /* ignore */ }
    setLoadingDecks(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchDecks();
  }, [status, fetchDecks]);

  async function handleGenerate(text: string, syllabusId?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, syllabusId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al generar flashcards");
      } else {
        setDecks((prev) => [data, ...prev]);
      }
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  }

  function getDueCards(deck: Deck): Flashcard[] {
    const now = new Date();
    return deck.flashcards.filter((c) => new Date(c.nextReview) <= now);
  }

  function startStudy(deck: Deck) {
    const due = getDueCards(deck);
    const cards = due.length > 0 ? due : deck.flashcards;
    setStudyDeck({ ...deck, flashcards: cards });
    setCardIndex(0);
    setFlipped(false);
    setStudyComplete(false);
    setStudyStats({ total: 0, good: 0 });
  }

  async function handleReview(quality: number) {
    if (!studyDeck) return;
    setReviewing(true);
    const card = studyDeck.flashcards[cardIndex];

    try {
      await fetch(`/api/flashcards/${studyDeck.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, quality }),
      });
    } catch { /* continue anyway */ }

    setStudyStats((prev) => ({
      total: prev.total + 1,
      good: quality >= 3 ? prev.good + 1 : prev.good,
    }));

    if (cardIndex + 1 < studyDeck.flashcards.length) {
      setCardIndex((prev) => prev + 1);
      setFlipped(false);
    } else {
      setStudyComplete(true);
    }
    setReviewing(false);
  }

  async function handleDeleteDeck(deckId: string) {
    if (!confirm("¿Eliminar este mazo y todas sus tarjetas?")) return;
    await fetch(`/api/flashcards?id=${deckId}`, { method: "DELETE" });
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    if (studyDeck?.id === deckId) setStudyDeck(null);
  }

  if (studyDeck && !studyComplete) {
    const card = studyDeck.flashcards[cardIndex];
    const progress = ((cardIndex + 1) / studyDeck.flashcards.length) * 100;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => setStudyDeck(null)}
          className="text-primary-600 hover:text-primary-800 text-sm mb-6 inline-block"
        >
          &larr; Volver a mis mazos
        </button>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{studyDeck.title}</h2>
          <span className="text-sm text-gray-500">
            {cardIndex + 1} / {studyDeck.flashcards.length}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          onClick={() => !flipped && setFlipped(true)}
          className={`card min-h-[250px] flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
            flipped
              ? "bg-primary-50 border-primary-200"
              : "hover:shadow-lg hover:border-primary-300"
          }`}
        >
          {!flipped ? (
            <>
              <p className="text-xs font-semibold text-primary-600 mb-3 uppercase tracking-wide">
                Frente
              </p>
              <p className="text-lg font-medium text-gray-900 px-4">
                {card.front}
              </p>
              <p className="text-sm text-gray-400 mt-6">
                Tocá para ver la respuesta
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-green-600 mb-3 uppercase tracking-wide">
                Dorso
              </p>
              <p className="text-lg text-gray-800 px-4">{card.back}</p>
            </>
          )}
        </div>

        {flipped && (
          <div className="mt-6">
            <p className="text-sm text-gray-600 text-center mb-3 font-medium">
              ¿Qué tan bien la sabías?
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {QUALITY_LABELS.map((q) => (
                <button
                  key={q.value}
                  onClick={() => handleReview(q.value)}
                  disabled={reviewing}
                  className={`${q.color} text-white text-xs font-semibold py-2.5 px-2 rounded-lg transition-colors disabled:opacity-50`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (studyComplete) {
    const pct = studyStats.total > 0 ? Math.round((studyStats.good / studyStats.total) * 100) : 0;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <p className="text-5xl mb-4">{pct >= 70 ? "🎉" : "💪"}</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Sesión completada!
          </h2>
          <p className="text-gray-600 mb-6">
            Respondiste {studyStats.good} de {studyStats.total} tarjetas correctamente ({pct}%)
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => startStudy(studyDeck!)}
              className="btn-primary"
            >
              Estudiar de nuevo
            </button>
            <button
              onClick={() => { setStudyDeck(null); setStudyComplete(false); fetchDecks(); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Volver a mis mazos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/dashboard"
        className="text-primary-600 hover:text-primary-800 text-sm mb-4 inline-block"
      >
        &larr; Volver al dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🃏</span>
        <h1 className="text-3xl font-bold text-gray-900">Flashcards</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Generá tarjetas de memoria a partir de tu material y estudialas con repetición espaciada.
      </p>

      {(autoLoading || (autoText && loading)) && (
        <div className="card text-center py-12 mb-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            Cargando apunte de {subjectName}...
          </p>
        </div>
      )}

      {!autoLoading && !(autoText && loading) && (
      <div className="card mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Generar nuevo mazo
        </h2>
        <MaterialInput
          onSubmit={handleGenerate}
          loading={loading}
          buttonLabel="Generar flashcards"
        />
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mis mazos</h2>

        {loadingDecks ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : decks.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500">
              No tenés mazos todavía. Generá uno arriba con tu material de estudio.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decks.map((deck) => {
              const dueCount = getDueCards(deck).length;
              return (
                <div key={deck.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-gray-900 flex-1 mr-2">
                      {deck.title}
                    </h3>
                    <button
                      onClick={() => handleDeleteDeck(deck.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                      title="Eliminar mazo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                    <span>{deck.flashcards.length} tarjetas</span>
                    {dueCount > 0 && (
                      <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded-full text-xs">
                        {dueCount} para repasar
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => startStudy(deck)}
                    className="btn-primary w-full text-sm py-2"
                  >
                    {dueCount > 0 ? `Repasar (${dueCount})` : "Estudiar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
