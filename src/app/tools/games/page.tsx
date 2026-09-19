"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface Question {
  statement: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface GameData {
  id: string;
  gameType: string;
  title: string;
  questions: unknown[];
  total: number;
  description?: string;
  explanation?: string;
}

interface GameRecord {
  id: string;
  gameType: string;
  title: string;
  score: number | null;
  total: number;
  streak: number;
  completedAt: string | null;
  createdAt: string;
}

interface AnswerRecord {
  questionIndex: number;
  selected: number;
  correct: boolean;
  timeLeft: number;
  points: number;
}

const TRIVIA_TIME = 15;
const TRUE_FALSE_TIME = 10;
const BASE_POINTS = 100;
const MAX_TIME_BONUS = 50;

type GameState = "setup" | "loading" | "playing" | "feedback" | "results";

interface MatchPair { left: string; right: string; }
interface OrderItem { text: string; correct_position: number; }
interface FillSentence { text_with_blank: string; answer: string; hint: string; explanation: string; }
interface HangmanWord { word: string; hint: string; }
interface MemoryPair { card_a: string; card_b: string; }
interface CategorizeItem { text: string; category: string; }
interface ArticleData { reference: string; text_with_blanks: string; blanks: { answer: string; options: string[]; }[]; }
interface MillionaireQuestion { question: string; options: string[]; correct_index: number; explanation: string; hint: string; difficulty: string; }
interface TimelineEvent { label: string; detail: string; year: string; correct_position: number; }

function InteractiveGame({ game, onComplete, onExit }: { game: GameData; onComplete: (score: number) => void; onExit: () => void }) {
  if (game.gameType === "matching") return <MatchingGameUI pairs={game.questions as MatchPair[]} title={game.title} onComplete={onComplete} onExit={onExit} />;
  if (game.gameType === "ordering") return <OrderingGameUI items={game.questions as OrderItem[]} title={game.title} description={game.description || ""} explanation={game.explanation || ""} onComplete={onComplete} onExit={onExit} />;
  if (game.gameType === "fill_blank") return <FillBlankGameUI sentences={game.questions as FillSentence[]} title={game.title} onComplete={onComplete} onExit={onExit} />;
  if (game.gameType === "hangman") return <HangmanGameUI words={game.questions as HangmanWord[]} title={game.title} onComplete={onComplete} onExit={onExit} />;
  if (game.gameType === "memory") return <MemoryGameUI pairs={game.questions as MemoryPair[]} title={game.title} onComplete={onComplete} onExit={onExit} />;
  if (game.gameType === "categorize") return <CategorizeGameUI items={game.questions as CategorizeItem[]} categories={(game as GameData & { categories?: string[] }).categories || []} title={game.title} explanation={game.explanation || ""} onComplete={onComplete} onExit={onExit} />;
  if (game.gameType === "article_fill") return <ArticleFillGameUI articles={game.questions as ArticleData[]} title={game.title} onComplete={onComplete} onExit={onExit} />;
  if (game.gameType === "millionaire") return <MillionaireGameUI questions={game.questions as MillionaireQuestion[]} title={game.title} onComplete={onComplete} onExit={onExit} />;
  if (game.gameType === "timeline") return <TimelineGameUI events={game.questions as TimelineEvent[]} title={game.title} description={game.description || ""} explanation={game.explanation || ""} onComplete={onComplete} onExit={onExit} />;
  if (game.gameType === "crossword") return <CrosswordGameUI words={game.questions as { word: string; clue: string; direction: string; row: number; col: number; number: number; }[]} title={game.title} onComplete={onComplete} onExit={onExit} />;
  return <FillBlankGameUI sentences={game.questions as FillSentence[]} title={game.title} onComplete={onComplete} onExit={onExit} />;
}

function MatchingGameUI({ pairs, title, onComplete, onExit }: { pairs: MatchPair[]; title: string; onComplete: (score: number) => void; onExit: () => void }) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [shuffledRight, setShuffledRight] = useState<number[]>([]);

  useEffect(() => {
    const indices = pairs.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledRight(indices);
  }, [pairs]);

  function handleRightClick(rightIdx: number) {
    if (selectedLeft === null || matched.has(rightIdx)) return;
    if (selectedLeft === rightIdx) {
      setMatched((prev) => new Set(prev).add(rightIdx));
      setSelectedLeft(null);
      const newMatched = matched.size + 1;
      if (newMatched === pairs.length) {
        const score = Math.max(0, pairs.length * 100 - errors * 25);
        setTimeout(() => onComplete(score), 500);
      }
    } else {
      setWrong(rightIdx);
      setErrors((e) => e + 1);
      setTimeout(() => { setWrong(null); setSelectedLeft(null); }, 800);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">🔗 {title}</h2>
        <button onClick={onExit} className="text-gray-400 hover:text-gray-600 text-sm">Salir</button>
      </div>
      <p className="text-gray-600 text-sm mb-4">Clickeá un concepto de la izquierda y luego su par de la derecha. {matched.size}/{pairs.length} pares encontrados.</p>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Conceptos</p>
          {pairs.map((p, i) => (
            <button
              key={`l-${i}`}
              onClick={() => !matched.has(i) && setSelectedLeft(i)}
              disabled={matched.has(i)}
              className={`w-full text-left p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                matched.has(i)
                  ? "border-green-300 bg-green-50 text-green-700 opacity-60"
                  : selectedLeft === i
                  ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200"
                  : "border-gray-200 hover:border-primary-300 text-gray-800"
              }`}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Definiciones</p>
          {shuffledRight.map((origIdx) => (
            <button
              key={`r-${origIdx}`}
              onClick={() => handleRightClick(origIdx)}
              disabled={matched.has(origIdx)}
              className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${
                matched.has(origIdx)
                  ? "border-green-300 bg-green-50 text-green-700 opacity-60"
                  : wrong === origIdx
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-gray-200 hover:border-indigo-300 text-gray-800"
              }`}
            >
              {pairs[origIdx].right}
            </button>
          ))}
        </div>
      </div>
      {errors > 0 && <p className="text-sm text-red-500 mt-4">Errores: {errors}</p>}
    </div>
  );
}

function OrderingGameUI({ items, title, description, explanation, onComplete, onExit }: { items: OrderItem[]; title: string; description: string; explanation: string; onComplete: (score: number) => void; onExit: () => void }) {
  const [order, setOrder] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    const indices = items.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setOrder(indices);
  }, [items]);

  function moveItem(from: number, to: number) {
    if (submitted || to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
  }

  function handleSubmit() {
    let correct = 0;
    order.forEach((itemIdx, pos) => {
      if (items[itemIdx].correct_position === pos) correct++;
    });
    setCorrectCount(correct);
    setSubmitted(true);
    const score = Math.round((correct / items.length) * 600);
    setTimeout(() => onComplete(score), 3000);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">📶 {title}</h2>
        <button onClick={onExit} className="text-gray-400 hover:text-gray-600 text-sm">Salir</button>
      </div>
      <p className="text-gray-600 text-sm mb-6">{description}</p>
      <div className="space-y-2">
        {order.map((itemIdx, pos) => {
          const isCorrect = submitted && items[itemIdx].correct_position === pos;
          const isWrong = submitted && items[itemIdx].correct_position !== pos;
          return (
            <div
              key={itemIdx}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                isCorrect ? "border-green-400 bg-green-50" : isWrong ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"
              }`}
            >
              <span className="text-sm font-bold text-gray-400 w-6">{pos + 1}.</span>
              <p className="flex-1 text-sm font-medium text-gray-800">{items[itemIdx].text}</p>
              {!submitted && (
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveItem(pos, pos - 1)} disabled={pos === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs px-1">▲</button>
                  <button onClick={() => moveItem(pos, pos + 1)} disabled={pos === order.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs px-1">▼</button>
                </div>
              )}
              {submitted && (
                <span className="text-xs font-medium">{isCorrect ? "✅" : `❌ (pos. ${items[itemIdx].correct_position + 1})`}</span>
              )}
            </div>
          );
        })}
      </div>
      {!submitted ? (
        <button onClick={handleSubmit} className="btn-primary mt-6">Verificar orden</button>
      ) : (
        <div className="mt-6 p-4 rounded-xl border-2 border-primary-200 bg-primary-50">
          <p className="font-bold text-primary-800 mb-1">{correctCount}/{items.length} en posición correcta</p>
          <p className="text-sm text-gray-700">{explanation}</p>
        </div>
      )}
    </div>
  );
}

function FillBlankGameUI({ sentences, title, onComplete, onExit }: { sentences: FillSentence[]; title: string; onComplete: (score: number) => void; onExit: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState<{ correct: boolean; userAnswer: string }[]>([]);

  const current = sentences[currentIdx];

  function normalize(s: string): string {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }

  function checkAnswer() {
    const correct = normalize(input) === normalize(current.answer);
    setIsCorrect(correct);
    setShowResult(true);
    const points = correct ? (showHint ? 50 : 100) : 0;
    setScore((s) => s + points);
    setResults((r) => [...r, { correct, userAnswer: input }]);
  }

  function nextQuestion() {
    if (currentIdx + 1 >= sentences.length) {
      onComplete(score);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setInput("");
    setShowResult(false);
    setIsCorrect(false);
    setShowHint(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">✏️ {title}</h2>
          <span className="text-sm text-gray-500">{currentIdx + 1}/{sentences.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-primary-600 font-bold">{score} pts</span>
          <button onClick={onExit} className="text-gray-400 hover:text-gray-600 text-sm">Salir</button>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${((currentIdx + (showResult ? 1 : 0)) / sentences.length) * 100}%` }} />
      </div>

      <div className="card mb-6">
        <p className="text-lg leading-relaxed text-gray-900">
          {current.text_with_blank.split("___").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                showResult ? (
                  <span className={`font-bold px-1 ${isCorrect ? "text-green-600 underline" : "text-red-600 line-through"}`}>
                    {isCorrect ? current.answer : input || "___"}
                  </span>
                ) : (
                  <span className="inline-block border-b-2 border-primary-400 min-w-[80px] mx-1" />
                )
              )}
            </span>
          ))}
        </p>
      </div>

      {!showResult ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="Escribí tu respuesta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && input.trim() && checkAnswer()}
              autoFocus
            />
            <button onClick={checkAnswer} disabled={!input.trim()} className="btn-primary px-6">
              Verificar
            </button>
          </div>
          {!showHint ? (
            <button onClick={() => setShowHint(true)} className="text-sm text-primary-600 hover:text-primary-800">
              💡 Ver pista (-50 pts)
            </button>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">💡 Pista: {current.hint}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className={`p-4 rounded-xl border-2 ${isCorrect ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
            <p className="font-bold text-sm mb-1">{isCorrect ? "✅ ¡Correcto!" : `❌ La respuesta era: ${current.answer}`}</p>
            <p className="text-sm text-gray-700">{current.explanation}</p>
          </div>
          <button onClick={nextQuestion} className="btn-primary">
            {currentIdx + 1 >= sentences.length ? "Ver resultados" : "Siguiente"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Ahorcado ──
function HangmanGameUI({ words, title, onComplete, onExit }: { words: HangmanWord[]; title: string; onComplete: (score: number) => void; onExit: () => void }) {
  const [wordIdx, setWordIdx] = useState(0);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState(0);
  const [solved, setSolved] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const maxErrors = 6;

  const current = words[wordIdx];
  const normalized = current.word.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑÜ]/g, "");
  const isWordComplete = normalized.split("").every(l => guessed.has(l));
  const isGameOver = errors >= maxErrors;

  useEffect(() => {
    if (isWordComplete && !showResult) {
      setSolved(s => s + 1);
      setShowResult(true);
    }
    if (isGameOver && !showResult) {
      setShowResult(true);
    }
  }, [isWordComplete, isGameOver, showResult]);

  function handleGuess(letter: string) {
    if (guessed.has(letter) || showResult) return;
    const next = new Set(Array.from(guessed));
    next.add(letter);
    setGuessed(next);
    if (!normalized.includes(letter)) setErrors(e => e + 1);
  }

  function nextWord() {
    if (wordIdx + 1 >= words.length) {
      onComplete(solved * BASE_POINTS);
      return;
    }
    setWordIdx(wordIdx + 1);
    setGuessed(new Set());
    setErrors(0);
    setShowResult(false);
  }

  const alphabet = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");
  const hangmanParts = ["O", "/", "|", "\\", "/", "\\"];

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">Salir</button>
      </div>
      <p className="text-sm text-gray-500 mb-2">Palabra {wordIdx + 1} de {words.length} | Resueltas: {solved}</p>
      <div className="bg-amber-50 rounded-lg p-3 mb-4">
        <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Pista</p>
        <p className="text-sm text-gray-700">{current.hint}</p>
      </div>
      <div className="text-center mb-4">
        <div className="font-mono text-3xl tracking-[0.3em] mb-4">
          {current.word.toUpperCase().split("").map((ch, i) => {
            const upper = ch.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, "");
            if (!upper) return <span key={i} className="mx-1">{ch}</span>;
            return <span key={i} className={`inline-block w-8 border-b-2 ${guessed.has(upper) || showResult ? "border-transparent" : "border-gray-400"}`}>
              {guessed.has(upper) || showResult ? upper : " "}
            </span>;
          })}
        </div>
        <div className="text-2xl font-mono text-red-500 h-8">
          {hangmanParts.slice(0, errors).join(" ")}
        </div>
        <p className="text-xs text-gray-400 mt-1">{maxErrors - errors} intentos restantes</p>
      </div>
      {!showResult && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-4">
          {alphabet.map(l => (
            <button key={l} onClick={() => handleGuess(l)} disabled={guessed.has(l)}
              className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                guessed.has(l)
                  ? normalized.includes(l) ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                  : "bg-gray-100 hover:bg-primary-100 text-gray-700"
              }`}>
              {l}
            </button>
          ))}
        </div>
      )}
      {showResult && (
        <div className={`text-center p-4 rounded-lg mb-4 ${isWordComplete ? "bg-green-50" : "bg-red-50"}`}>
          <p className={`font-bold ${isWordComplete ? "text-green-700" : "text-red-700"}`}>
            {isWordComplete ? "¡Correcto!" : `La palabra era: ${current.word.toUpperCase()}`}
          </p>
          <button onClick={nextWord} className="btn-primary mt-3">
            {wordIdx + 1 >= words.length ? "Ver resultados" : "Siguiente palabra"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Memotest ──
function MemoryGameUI({ pairs, title, onComplete, onExit }: { pairs: MemoryPair[]; title: string; onComplete: (score: number) => void; onExit: () => void }) {
  const [cards, setCards] = useState<{ id: number; text: string; pairIdx: number; flipped: boolean; matched: boolean }[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);

  useEffect(() => {
    const all: { id: number; text: string; pairIdx: number; flipped: boolean; matched: boolean }[] = [];
    pairs.forEach((p, i) => {
      all.push({ id: i * 2, text: p.card_a, pairIdx: i, flipped: false, matched: false });
      all.push({ id: i * 2 + 1, text: p.card_b, pairIdx: i, flipped: false, matched: false });
    });
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    setCards(all);
  }, [pairs]);

  function handleClick(idx: number) {
    if (selected.length >= 2 || cards[idx].flipped || cards[idx].matched) return;
    const next = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    setCards(next);
    const newSelected = [...selected, idx];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newSelected;
      if (next[a].pairIdx === next[b].pairIdx) {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, matched: true } : c));
          setMatchedCount(mc => {
            const newMc = mc + 1;
            if (newMc === pairs.length) onComplete(Math.max(pairs.length * BASE_POINTS - moves * 10, pairs.length * 50));
            return newMc;
          });
          setSelected([]);
        }, 500);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, flipped: false } : c));
          setSelected([]);
        }, 1000);
      }
    }
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">Salir</button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Pares encontrados: {matchedCount}/{pairs.length} | Movimientos: {moves}</p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, i) => (
          <button key={card.id} onClick={() => handleClick(i)}
            className={`h-24 rounded-lg text-xs font-medium p-2 transition-all ${
              card.matched ? "bg-green-100 text-green-700 border-2 border-green-300" :
              card.flipped ? "bg-primary-100 text-primary-800 border-2 border-primary-400" :
              "bg-gray-200 hover:bg-gray-300 text-transparent border-2 border-gray-300"
            }`}>
            {card.flipped || card.matched ? card.text : "?"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Categorización ──
function CategorizeGameUI({ items, categories, title, explanation, onComplete, onExit }: { items: CategorizeItem[]; categories: string[]; title: string; explanation: string; onComplete: (score: number) => void; onExit: () => void }) {
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  function assign(itemIdx: number, cat: string) {
    if (submitted) return;
    setAssignments({ ...assignments, [itemIdx]: cat });
  }

  function handleSubmit() {
    let correct = 0;
    items.forEach((item, i) => {
      if (assignments[i] === item.category) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    onComplete(correct * BASE_POINTS);
  }

  const allAssigned = Object.keys(assignments).length === items.length;

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">Salir</button>
      </div>
      <p className="text-sm text-gray-600 mb-4">Asigná cada concepto a su categoría correcta.</p>
      <div className="flex gap-2 mb-4 flex-wrap">
        {categories.map(cat => (
          <span key={cat} className="bg-primary-100 text-primary-800 text-xs font-bold px-3 py-1 rounded-full">{cat}</span>
        ))}
      </div>
      <div className="space-y-2 mb-4">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
            submitted
              ? assignments[i] === item.category ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
              : assignments[i] ? "bg-primary-50 border-primary-200" : "bg-white border-gray-200"
          }`}>
            <span className="text-sm font-medium text-gray-800 flex-1">{item.text}</span>
            {submitted && assignments[i] !== item.category && (
              <span className="text-xs text-red-600">{item.category}</span>
            )}
            <div className="flex gap-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => assign(i, cat)} disabled={submitted}
                  className={`text-xs px-2 py-1 rounded-full transition-all ${
                    assignments[i] === cat
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {cat.length > 15 ? cat.slice(0, 15) + "..." : cat}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!submitted ? (
        <button onClick={handleSubmit} disabled={!allAssigned} className="btn-primary w-full">
          Verificar ({Object.keys(assignments).length}/{items.length})
        </button>
      ) : (
        <div className="text-center">
          <p className="text-lg font-bold text-primary-700">{score}/{items.length} correctas</p>
          {explanation && <p className="text-sm text-gray-600 mt-2">{explanation}</p>}
        </div>
      )}
    </div>
  );
}

// ── Completa el artículo ──
function ArticleFillGameUI({ articles, title, onComplete, onExit }: { articles: ArticleData[]; title: string; onComplete: (score: number) => void; onExit: () => void }) {
  const [artIdx, setArtIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [totalCorrect, setTotalCorrect] = useState(0);

  const current = articles[artIdx];

  function selectAnswer(blankIdx: number, option: string) {
    if (submitted) return;
    setAnswers({ ...answers, [`${artIdx}-${blankIdx}`]: option });
  }

  function handleSubmit() {
    let correct = 0;
    current.blanks.forEach((blank, bi) => {
      if (answers[`${artIdx}-${bi}`] === blank.answer) correct++;
    });
    setTotalCorrect(tc => tc + correct);
    setSubmitted(true);
  }

  function next() {
    if (artIdx + 1 >= articles.length) {
      onComplete(totalCorrect * BASE_POINTS);
      return;
    }
    setArtIdx(artIdx + 1);
    setSubmitted(false);
  }

  const allAnswered = current.blanks.every((_, bi) => answers[`${artIdx}-${bi}`]);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">Salir</button>
      </div>
      <p className="text-sm text-gray-500 mb-2">Artículo {artIdx + 1} de {articles.length}</p>
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{current.reference}</p>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{current.text_with_blanks}</p>
      </div>
      <div className="space-y-3 mb-4">
        {current.blanks.map((blank, bi) => (
          <div key={bi}>
            <p className="text-xs font-semibold text-gray-600 mb-1">Espacio {bi + 1}</p>
            <div className="flex flex-wrap gap-2">
              {blank.options.map(opt => (
                <button key={opt} onClick={() => selectAnswer(bi, opt)} disabled={submitted}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                    submitted
                      ? opt === blank.answer ? "bg-green-100 border-green-400 text-green-800 font-bold"
                        : answers[`${artIdx}-${bi}`] === opt ? "bg-red-100 border-red-400 text-red-800" : "bg-gray-50 border-gray-200 text-gray-400"
                      : answers[`${artIdx}-${bi}`] === opt ? "bg-primary-100 border-primary-400 text-primary-800" : "bg-white border-gray-200 hover:border-gray-400"
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!submitted ? (
        <button onClick={handleSubmit} disabled={!allAnswered} className="btn-primary w-full">Verificar</button>
      ) : (
        <button onClick={next} className="btn-primary w-full">
          {artIdx + 1 >= articles.length ? "Ver resultados" : "Siguiente artículo"}
        </button>
      )}
    </div>
  );
}

// ── Quién quiere ser abogado ──
function MillionaireGameUI({ questions, title, onComplete, onExit }: { questions: MillionaireQuestion[]; title: string; onComplete: (score: number) => void; onExit: () => void }) {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [lifelines, setLifelines] = useState({ fifty: true, hint: true, skip: true });
  const [hiddenOptions, setHiddenOptions] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const current = questions[qIdx];
  const prizes = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000];

  function handleConfirm() {
    if (selected === null) return;
    setConfirmed(true);
    if (selected !== current.correct_index) {
      setGameOver(true);
    }
  }

  function handleNext() {
    if (gameOver) {
      const earned = qIdx > 0 ? prizes[qIdx - 1] : 0;
      onComplete(earned);
      return;
    }
    if (qIdx + 1 >= questions.length) {
      onComplete(prizes[qIdx]);
      return;
    }
    setQIdx(qIdx + 1);
    setSelected(null);
    setConfirmed(false);
    setHiddenOptions(new Set());
    setShowHint(false);
  }

  function useFifty() {
    if (!lifelines.fifty) return;
    setLifelines({ ...lifelines, fifty: false });
    const wrong = [0, 1, 2, 3].filter(i => i !== current.correct_index);
    const toHide = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
    setHiddenOptions(new Set(toHide));
  }

  function useHint() {
    if (!lifelines.hint) return;
    setLifelines({ ...lifelines, hint: false });
    setShowHint(true);
  }

  function useSkip() {
    if (!lifelines.skip) return;
    setLifelines({ ...lifelines, skip: false });
    if (qIdx + 1 < questions.length) {
      setQIdx(qIdx + 1);
      setSelected(null);
      setConfirmed(false);
      setHiddenOptions(new Set());
      setShowHint(false);
    }
  }

  const diffColors: Record<string, string> = { facil: "bg-green-100 text-green-700", media: "bg-amber-100 text-amber-700", dificil: "bg-red-100 text-red-700" };
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="card bg-gradient-to-b from-indigo-950 to-indigo-900 text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onExit} className="text-sm text-indigo-300 hover:text-white">Salir</button>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${diffColors[current.difficulty] || ""}`}>{current.difficulty}</span>
        <span className="text-amber-400 font-bold">${prizes[qIdx].toLocaleString()}</span>
        <span className="text-xs text-indigo-300">Pregunta {qIdx + 1}/10</span>
      </div>
      <div className="bg-indigo-800 rounded-xl p-4 mb-4">
        <p className="text-center font-medium">{current.question}</p>
      </div>
      {showHint && (
        <div className="bg-amber-900/50 rounded-lg p-2 mb-3">
          <p className="text-xs text-amber-300">Pista: {current.hint}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {current.options.map((opt, i) => {
          if (hiddenOptions.has(i)) return <div key={i} className="h-12 rounded-lg bg-indigo-800/30" />;
          let bg = "bg-indigo-700 hover:bg-indigo-600";
          if (confirmed) {
            if (i === current.correct_index) bg = "bg-green-600";
            else if (i === selected) bg = "bg-red-600";
            else bg = "bg-indigo-800/50";
          } else if (i === selected) bg = "bg-amber-600";
          return (
            <button key={i} onClick={() => !confirmed && setSelected(i)}
              className={`${bg} rounded-lg p-3 text-sm text-left transition-all`}>
              <span className="font-bold mr-2">{letters[i]}:</span>{opt}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center gap-2 mb-4">
        <button onClick={useFifty} disabled={!lifelines.fifty || confirmed}
          className={`text-xs px-3 py-1.5 rounded-full ${lifelines.fifty ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-800/30 text-indigo-600"}`}>50/50</button>
        <button onClick={useHint} disabled={!lifelines.hint || confirmed}
          className={`text-xs px-3 py-1.5 rounded-full ${lifelines.hint ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-800/30 text-indigo-600"}`}>Pista</button>
        <button onClick={useSkip} disabled={!lifelines.skip || confirmed}
          className={`text-xs px-3 py-1.5 rounded-full ${lifelines.skip ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-800/30 text-indigo-600"}`}>Cambiar</button>
      </div>
      {!confirmed ? (
        <button onClick={handleConfirm} disabled={selected === null}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all disabled:opacity-50">
          Respuesta final
        </button>
      ) : (
        <div className="text-center">
          <p className={`font-bold mb-2 ${gameOver ? "text-red-400" : "text-green-400"}`}>
            {gameOver ? "¡Perdiste!" : "¡Correcto!"}
          </p>
          <p className="text-xs text-indigo-300 mb-3">{current.explanation}</p>
          <button onClick={handleNext} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold">
            {gameOver || qIdx + 1 >= questions.length ? "Ver resultados" : "Siguiente pregunta"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Línea de tiempo ──
function TimelineGameUI({ events, title, description, explanation, onComplete, onExit }: { events: TimelineEvent[]; title: string; description: string; explanation: string; onComplete: (score: number) => void; onExit: () => void }) {
  const [order, setOrder] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const indices = events.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setOrder(indices);
  }, [events]);

  function moveUp(pos: number) {
    if (pos === 0 || submitted) return;
    const next = [...order];
    [next[pos], next[pos - 1]] = [next[pos - 1], next[pos]];
    setOrder(next);
  }

  function moveDown(pos: number) {
    if (pos >= order.length - 1 || submitted) return;
    const next = [...order];
    [next[pos], next[pos + 1]] = [next[pos + 1], next[pos]];
    setOrder(next);
  }

  function handleSubmit() {
    let correct = 0;
    order.forEach((evtIdx, pos) => {
      if (events[evtIdx].correct_position === pos) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    onComplete(correct * BASE_POINTS);
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">Salir</button>
      </div>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      <div className="space-y-2 mb-4">
        {order.map((evtIdx, pos) => {
          const evt = events[evtIdx];
          const isCorrect = submitted && evt.correct_position === pos;
          const isWrong = submitted && evt.correct_position !== pos;
          return (
            <div key={evtIdx} className={`flex items-center gap-3 p-3 rounded-lg border ${
              isCorrect ? "bg-green-50 border-green-300" : isWrong ? "bg-red-50 border-red-300" : "bg-white border-gray-200"
            }`}>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(pos)} disabled={submitted || pos === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20">&#9650;</button>
                <button onClick={() => moveDown(pos)} disabled={submitted || pos >= order.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20">&#9660;</button>
              </div>
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">{pos + 1}</span>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{evt.label}</p>
                <p className="text-xs text-gray-500">{evt.detail}</p>
              </div>
              <span className="text-xs font-mono text-gray-400">{evt.year}</span>
              {isWrong && <span className="text-xs text-red-500">#{evt.correct_position + 1}</span>}
            </div>
          );
        })}
      </div>
      {!submitted ? (
        <button onClick={handleSubmit} className="btn-primary w-full">Verificar orden</button>
      ) : (
        <div className="text-center">
          <p className="text-lg font-bold text-primary-700">{score}/{events.length} en posición correcta</p>
          {explanation && <p className="text-sm text-gray-600 mt-2">{explanation}</p>}
        </div>
      )}
    </div>
  );
}

// ── Crucigrama ──
function CrosswordGameUI({ words, title, onComplete, onExit }: { words: { word: string; clue: string; direction: string; row: number; col: number; number: number; }[]; title: string; onComplete: (score: number) => void; onExit: () => void }) {
  const gridSize = 15;
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const cellMap = new Map<string, { letter: string; wordNumbers: number[] }>();
  words.forEach(w => {
    for (let i = 0; i < w.word.length; i++) {
      const r = w.direction === "horizontal" ? w.row : w.row + i;
      const c = w.direction === "horizontal" ? w.col + i : w.col;
      const key = `${r}-${c}`;
      const existing = cellMap.get(key) || { letter: w.word[i], wordNumbers: [] };
      if (i === 0) existing.wordNumbers.push(w.number);
      existing.letter = w.word[i];
      cellMap.set(key, existing);
    }
  });

  function handleInput(key: string, val: string) {
    if (submitted) return;
    setInputs({ ...inputs, [key]: val.toUpperCase().slice(0, 1) });
  }

  function handleSubmit() {
    let correct = 0;
    let total = 0;
    cellMap.forEach((cell, key) => {
      total++;
      if ((inputs[key] || "").toUpperCase() === cell.letter.toUpperCase()) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    onComplete(Math.round((correct / total) * words.length * BASE_POINTS));
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onExit} className="text-sm text-gray-500 hover:text-gray-700">Salir</button>
      </div>
      <div className="overflow-x-auto mb-4">
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${gridSize}, 28px)` }}>
          {Array.from({ length: gridSize * gridSize }, (_, idx) => {
            const r = Math.floor(idx / gridSize);
            const c = idx % gridSize;
            const key = `${r}-${c}`;
            const cell = cellMap.get(key);
            if (!cell) return <div key={key} className="w-7 h-7" />;
            const isCorrect = submitted && (inputs[key] || "").toUpperCase() === cell.letter.toUpperCase();
            const isWrong = submitted && !isCorrect;
            return (
              <div key={key} className={`w-7 h-7 border border-gray-300 relative ${submitted ? isCorrect ? "bg-green-100" : "bg-red-100" : "bg-white"}`}>
                {cell.wordNumbers.length > 0 && (
                  <span className="absolute top-0 left-0.5 text-[7px] text-gray-500 leading-none">{cell.wordNumbers[0]}</span>
                )}
                <input
                  type="text"
                  maxLength={1}
                  value={submitted && isWrong ? cell.letter : inputs[key] || ""}
                  onChange={e => handleInput(key, e.target.value)}
                  disabled={submitted}
                  className="w-full h-full text-center text-xs font-bold uppercase bg-transparent outline-none"
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Horizontales</p>
          {words.filter(w => w.direction === "horizontal").sort((a, b) => a.number - b.number).map(w => (
            <p key={w.number} className="text-xs text-gray-700 mb-1"><strong>{w.number}.</strong> {w.clue}</p>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Verticales</p>
          {words.filter(w => w.direction === "vertical").sort((a, b) => a.number - b.number).map(w => (
            <p key={w.number} className="text-xs text-gray-700 mb-1"><strong>{w.number}.</strong> {w.clue}</p>
          ))}
        </div>
      </div>
      {!submitted ? (
        <button onClick={handleSubmit} className="btn-primary w-full">Verificar crucigrama</button>
      ) : (
        <p className="text-center text-lg font-bold text-primary-700">{score} letras correctas de {cellMap.size}</p>
      )}
    </div>
  );
}

export default function GamesPage() {
  const { status } = useSession();
  const router = useRouter();

  const [gameState, setGameState] = useState<GameState>("setup");
  const [gameType, setGameType] = useState<"trivia" | "true_false" | "matching" | "ordering" | "fill_blank" | "hangman" | "crossword" | "memory" | "categorize" | "article_fill" | "millionaire" | "timeline">("trivia");
  const [examType, setExamType] = useState<"parcial" | "final" | "libre">("parcial");
  const [error, setError] = useState("");
  const [game, setGame] = useState<GameData | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      if (data.games) setGames(data.games);
    } catch { /* ignore */ }
    setLoadingGames(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchGames();
  }, [status, fetchGames]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const totalTime = gameType === "trivia" ? TRIVIA_TIME : gameType === "true_false" ? TRUE_FALSE_TIME : TRIVIA_TIME;

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(totalTime * 10);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 100);
  }

  function handleTimeUp() {
    if (showFeedback) return;
    processAnswer(-1);
  }

  function processAnswer(selected: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!game) return;

    const question = game.questions[currentQ] as Question;
    const correct = selected === question.correct_index;
    const remaining = timeLeft / 10;
    const timeBonus = correct
      ? Math.round((remaining / totalTime) * MAX_TIME_BONUS)
      : 0;
    const points = correct ? BASE_POINTS + timeBonus : 0;

    const newStreak = correct ? streak + 1 : 0;
    const newMaxStreak = Math.max(maxStreak, newStreak);

    setSelectedAnswer(selected);
    setShowFeedback(true);
    setScore((prev) => prev + points);
    setStreak(newStreak);
    setMaxStreak(newMaxStreak);

    const record: AnswerRecord = {
      questionIndex: currentQ,
      selected,
      correct,
      timeLeft: remaining,
      points,
    };
    setAnswers((prev) => [...prev, record]);

    feedbackTimeoutRef.current = setTimeout(() => {
      const nextQ = currentQ + 1;
      if (nextQ >= game.questions.length) {
        const finalScore = score + points;
        const finalAnswers = [...answers, record];
        completeGame(game.id, finalAnswers, finalScore, newMaxStreak);
        setGameState("results");
      } else {
        setCurrentQ(nextQ);
        setSelectedAnswer(null);
        setShowFeedback(false);
        startTimer();
      }
    }, 2000);
  }

  async function completeGame(
    id: string,
    finalAnswers: AnswerRecord[],
    finalScore: number,
    finalStreak: number
  ) {
    try {
      await fetch(`/api/games/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: finalAnswers,
          score: finalScore,
          streak: finalStreak,
        }),
      });
      fetchGames();
    } catch { /* ignore */ }
  }

  async function handleGenerate(text: string, syllabusId?: string) {
    setGameState("loading");
    setError("");
    try {
      const res = await fetch("/api/ai/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, gameType, examType, syllabusId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al generar el juego");
        setGameState("setup");
      } else {
        setGame(data);
        setCurrentQ(0);
        setScore(0);
        setStreak(0);
        setMaxStreak(0);
        setAnswers([]);
        setSelectedAnswer(null);
        setShowFeedback(false);
        setGameState("playing");
        if (gameType === "trivia" || gameType === "true_false") {
          setTimeLeft(totalTime * 10);
          setTimeout(() => startTimer(), 300);
        }
      }
    } catch {
      setError("Error de conexión");
      setGameState("setup");
    }
  }

  function resetGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setGame(null);
    setGameState("setup");
    setCurrentQ(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta partida?")) return;
    await fetch(`/api/games?id=${id}`, { method: "DELETE" });
    setGames((prev) => prev.filter((g) => g.id !== id));
  }

  function getMedal(pct: number): string {
    if (pct >= 90) return "🏆";
    if (pct >= 70) return "🥇";
    if (pct >= 50) return "🥈";
    return "🥉";
  }

  const timerPct = (timeLeft / (totalTime * 10)) * 100;
  const timerColor =
    timerPct > 60 ? "bg-green-500" : timerPct > 30 ? "bg-yellow-500" : "bg-red-500";

  if (gameState === "loading") {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl">
              {gameType === "trivia" ? "🎯" : "✅"}
            </span>
          </div>
          <p className="text-gray-600 font-medium">Generando preguntas...</p>
          <p className="text-gray-400 text-sm">Esto puede tomar unos segundos</p>
        </div>
      </div>
    );
  }

  if (gameState === "playing" && game && (game.gameType === "matching" || game.gameType === "ordering" || game.gameType === "fill_blank")) {
    return <InteractiveGame game={game} onComplete={(finalScore) => { setScore(finalScore); completeGame(game.id, [], finalScore, 0); setGameState("results"); }} onExit={resetGame} />;
  }

  if (gameState === "playing" && game) {
    const question = game.questions[currentQ] as Question;
    const isTrivia = game.gameType === "trivia";

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-primary-600">{score}</span>
            <span className="text-sm text-gray-400">pts</span>
          </div>
          <div className="text-center">
            <span className="text-sm font-medium text-gray-600">
              {currentQ + 1} / {game.questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                🔥 {streak}
              </span>
            )}
            <button
              onClick={resetGame}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="w-full h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{
              width: `${((currentQ + (showFeedback ? 1 : 0)) / game.questions.length) * 100}%`,
            }}
          />
        </div>

        <div className="card mb-6">
          <p className="text-lg font-medium text-gray-900 leading-relaxed">
            {question.statement}
          </p>
        </div>

        <div className={`grid gap-3 ${isTrivia ? "grid-cols-1" : "grid-cols-2"}`}>
          {question.options.map((option, idx) => {
            let btnClass =
              "w-full text-left p-4 rounded-xl border-2 font-medium transition-all ";

            if (showFeedback) {
              if (idx === question.correct_index) {
                btnClass +=
                  "border-green-500 bg-green-50 text-green-800 ring-2 ring-green-300";
              } else if (idx === selectedAnswer && idx !== question.correct_index) {
                btnClass +=
                  "border-red-500 bg-red-50 text-red-800 ring-2 ring-red-300";
              } else {
                btnClass += "border-gray-200 text-gray-400 opacity-50";
              }
            } else {
              btnClass +=
                "border-gray-200 hover:border-primary-400 hover:bg-primary-50 text-gray-700 active:scale-[0.98]";
            }

            if (!isTrivia) {
              btnClass += " text-center text-lg py-6";
              if (!showFeedback) {
                btnClass +=
                  idx === 0
                    ? " hover:border-green-400 hover:bg-green-50"
                    : " hover:border-red-400 hover:bg-red-50";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => !showFeedback && processAnswer(idx)}
                disabled={showFeedback}
                className={btnClass}
              >
                {isTrivia && (
                  <span className="inline-block w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-sm font-bold leading-7 text-center mr-3 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                )}
                {!isTrivia && (
                  <span className="mr-2">{idx === 0 ? "✅" : "❌"}</span>
                )}
                {option}
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div
            className={`mt-4 p-4 rounded-xl border-2 ${
              selectedAnswer === question.correct_index || selectedAnswer === -1
                ? selectedAnswer === -1
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm">
                {selectedAnswer === -1
                  ? "⏰ ¡Se acabó el tiempo!"
                  : selectedAnswer === question.correct_index
                  ? `✅ ¡Correcto! +${answers[answers.length - 1]?.points || 0} pts`
                  : "❌ Incorrecto"}
              </span>
            </div>
            <p className="text-sm text-gray-700">{question.explanation}</p>
          </div>
        )}
      </div>
    );
  }

  if (gameState === "results" && game) {
    const isInteractive = ["matching", "ordering", "fill_blank", "hangman", "crossword", "memory", "categorize", "article_fill", "millionaire", "timeline"].includes(game.gameType);
    const totalQuestions = game.questions.length;
    const correctCount = answers.filter((a) => a.correct).length;
    const pct = isInteractive ? Math.min(100, Math.round((score / (totalQuestions * 100)) * 100)) : Math.round((correctCount / totalQuestions) * 100);
    const avgTime =
      answers.length > 0
        ? (answers.reduce((acc, a) => acc + (totalTime - a.timeLeft), 0) / answers.length).toFixed(1)
        : "0";

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center mb-8 bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-200">
          <div className="text-6xl mb-2">{getMedal(pct)}</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">
            {score} puntos
          </h2>
          <p className="text-gray-500 mb-4">{game.title}</p>

          {isInteractive ? (
            <div className="max-w-xs mx-auto mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold text-primary-600">{pct}%</p>
                <p className="text-xs text-gray-500">Rendimiento</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="text-2xl font-bold text-green-600">
                  {correctCount}/{totalQuestions}
                </p>
                <p className="text-xs text-gray-500">Correctas</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="text-2xl font-bold text-orange-600">
                  🔥 {maxStreak}
                </p>
                <p className="text-xs text-gray-500">Racha máx.</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <p className="text-2xl font-bold text-blue-600">{avgTime}s</p>
                <p className="text-xs text-gray-500">Tiempo prom.</p>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button onClick={resetGame} className="btn-primary py-2 px-6">
              Jugar de nuevo
            </button>
            <Link
              href="/dashboard"
              className="py-2 px-6 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {!isInteractive && (
          <>
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Revisión de respuestas
            </h3>
            <div className="space-y-3">
              {game.questions.map((q: unknown, idx: number) => {
                const question = q as Question;
                const answer = answers[idx];
                const correct = answer?.correct;
                const timedOut = answer?.selected === -1;
                return (
                  <div
                    key={idx}
                    className={`card border-l-4 ${
                      correct
                        ? "border-l-green-500"
                        : "border-l-red-500"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5">
                        {correct ? "✅" : timedOut ? "⏰" : "❌"}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">
                          {question.statement}
                        </p>
                        {!correct && (
                          <p className="text-sm text-green-700 mb-1">
                            Correcta: {question.options[question.correct_index]}
                          </p>
                        )}
                        {answer && !timedOut && !correct && (
                          <p className="text-sm text-red-600 mb-1">
                            Tu respuesta: {question.options[answer.selected]}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">{question.explanation}</p>
                      </div>
                      {answer && (
                        <span className="text-xs font-bold text-gray-400 shrink-0">
                          +{answer.points}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
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
        <span className="text-3xl">🎮</span>
        <h1 className="text-3xl font-bold text-gray-900">Juegos interactivos</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Poné a prueba tus conocimientos con distintos modos de juego interactivos.
      </p>

      <div className="card mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Elegí el modo de juego
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {([
            { key: "trivia" as const, icon: "🎯", name: "Trivia", desc: "10 preguntas multiple choice" },
            { key: "true_false" as const, icon: "✅", name: "V o F", desc: "12 afirmaciones para evaluar" },
            { key: "matching" as const, icon: "🔗", name: "Relacionar", desc: "8 pares concepto-definición" },
            { key: "ordering" as const, icon: "📶", name: "Ordenar", desc: "6 items en secuencia correcta" },
            { key: "fill_blank" as const, icon: "✏️", name: "Completar", desc: "8 oraciones con espacios" },
            { key: "hangman" as const, icon: "💀", name: "Ahorcado", desc: "Adiviná términos letra a letra" },
            { key: "memory" as const, icon: "🧠", name: "Memotest", desc: "Encontrá pares de cartas" },
            { key: "categorize" as const, icon: "📂", name: "Categorizar", desc: "Clasificá conceptos" },
            { key: "article_fill" as const, icon: "📜", name: "Artículos", desc: "Completá artículos del código" },
            { key: "millionaire" as const, icon: "💰", name: "Millonario", desc: "10 preguntas, 3 comodines" },
            { key: "timeline" as const, icon: "📅", name: "Línea de tiempo", desc: "Ordená cronológicamente" },
            { key: "crossword" as const, icon: "⬜", name: "Crucigrama", desc: "Grilla de palabras cruzadas" },
          ]).map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGameType(g.key)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                gameType === g.key
                  ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="text-3xl block mb-1">{g.icon}</span>
              <p className="font-bold text-gray-900 text-sm">{g.name}</p>
              <p className="text-xs text-gray-500 mt-1">{g.desc}</p>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label htmlFor="examType" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de examen
          </label>
          <select
            id="examType"
            className="input-field"
            value={examType}
            onChange={(e) => setExamType(e.target.value as "parcial" | "final" | "libre")}
          >
            <option value="parcial">Parcial - temas puntuales</option>
            <option value="final">Final - integrador</option>
            <option value="libre">Libre - dificultad maxima</option>
          </select>
        </div>

        <MaterialInput
          onSubmit={handleGenerate}
          loading={false}
          buttonLabel={
            gameType === "trivia" ? "🎯 Empezar trivia" : "✅ Empezar juego"
          }
        />
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mis partidas</h2>

        {loadingGames ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : games.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">🕹️</p>
            <p className="text-gray-500">
              No tenés partidas todavía. Elegí un modo y empezá a jugar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((g) => {
              const pct =
                g.score !== null && g.total > 0
                  ? Math.round(
                      (g.score /
                        (g.total * (BASE_POINTS + MAX_TIME_BONUS))) *
                        100
                    )
                  : null;
              return (
                <div key={g.id} className="card hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center shrink-0 text-xl">
                      {g.gameType === "trivia" ? "🎯" : "✅"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {g.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>
                          {g.gameType === "trivia"
                            ? "Trivia"
                            : "V/F"}
                        </span>
                        <span>&middot;</span>
                        {g.completedAt ? (
                          <>
                            <span className="font-medium text-primary-600">
                              {g.score} pts
                            </span>
                            <span>&middot;</span>
                            <span>🔥 {g.streak}</span>
                          </>
                        ) : (
                          <span className="text-yellow-600">Sin completar</span>
                        )}
                        <span>&middot;</span>
                        <span>
                          {new Date(g.createdAt).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                      title="Eliminar"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
