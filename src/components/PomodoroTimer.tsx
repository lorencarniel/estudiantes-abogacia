"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Phase = "study" | "break";

interface Props {
  studyMinutes?: number;
  breakMinutes?: number;
  onClose?: () => void;
}

export default function PomodoroTimer({ studyMinutes = 25, breakMinutes = 5, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("study");
  const [secondsLeft, setSecondsLeft] = useState(studyMinutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = phase === "study" ? studyMinutes * 60 : breakMinutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const switchPhase = useCallback(() => {
    if (phase === "study") {
      setSessions(s => s + 1);
      setPhase("break");
      setSecondsLeft(breakMinutes * 60);
      try { new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==").play(); } catch {}
    } else {
      setPhase("study");
      setSecondsLeft(studyMinutes * 60);
    }
  }, [phase, studyMinutes, breakMinutes]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          switchPhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, switchPhase]);

  function reset() {
    setRunning(false);
    setPhase("study");
    setSecondsLeft(studyMinutes * 60);
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="card text-center">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pomodoro</h3>
        {onClose && (
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">Cerrar</button>
        )}
      </div>
      <div className="relative w-40 h-40 mx-auto mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-700" strokeWidth="8" />
          <circle cx="60" cy="60" r={radius} fill="none"
            stroke={phase === "study" ? "#2563eb" : "#16a34a"}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </span>
          <span className={`text-xs font-semibold uppercase mt-1 ${phase === "study" ? "text-primary-600" : "text-green-600"}`}>
            {phase === "study" ? "Estudiando" : "Descanso"}
          </span>
        </div>
      </div>
      <div className="flex justify-center gap-3 mb-3">
        <button onClick={() => setRunning(!running)}
          className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
            running ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-primary-600 hover:bg-primary-700 text-white"
          }`}>
          {running ? "Pausar" : "Iniciar"}
        </button>
        <button onClick={reset} className="px-5 py-2 rounded-lg font-semibold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          Reiniciar
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Sesiones completadas: {sessions}</p>
    </div>
  );
}
