"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface AudioItem {
  id: string;
  title: string;
  script: string;
  duration: number;
  voice: string;
  createdAt: string;
}

const VOICES = [
  { id: "nova", label: "Nova", desc: "Femenina, cálida" },
  { id: "alloy", label: "Alloy", desc: "Neutral" },
  { id: "echo", label: "Echo", desc: "Masculina" },
  { id: "onyx", label: "Onyx", desc: "Masculina, grave" },
  { id: "shimmer", label: "Shimmer", desc: "Femenina, suave" },
  { id: "fable", label: "Fable", desc: "Expresiva" },
];

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudiosPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState("nova");
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [loadingAudios, setLoadingAudios] = useState(true);

  const [playing, setPlaying] = useState<AudioItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showScript, setShowScript] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchAudios = useCallback(async () => {
    try {
      const res = await fetch("/api/audios");
      const data = await res.json();
      if (data.audios) setAudios(data.audios);
    } catch { /* ignore */ }
    setLoadingAudios(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchAudios();
  }, [status, fetchAudios]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function handleGenerate(text: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al generar audio");
      } else {
        setAudios((prev) => [data, ...prev]);
      }
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  }

  function playAudio(item: AudioItem) {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`/api/audios/${item.id}/stream`);
    audioRef.current = audio;
    audio.playbackRate = speed;

    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
    });

    audio.play();
    setPlaying(item);
    setIsPlaying(true);
    setShowScript(false);
  }

  function togglePlayPause() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }

  function handleSpeed(newSpeed: number) {
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este audio?")) return;
    await fetch(`/api/audios?id=${id}`, { method: "DELETE" });
    setAudios((prev) => prev.filter((a) => a.id !== id));
    if (playing?.id === id) stopAudio();
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}min ${s}s` : `${m}min`;
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
        <span className="text-3xl">🎧</span>
        <h1 className="text-3xl font-bold text-gray-900">Audios explicativos</h1>
      </div>
      <p className="text-gray-600 mb-6">
        La IA genera una explicación tipo clase y la convierte en audio para que
        puedas escucharla donde sea.
      </p>

      <div className="card mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Generar audio</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voz del profesor
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {VOICES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVoice(v.id)}
                className={`text-center p-2 rounded-lg border-2 transition-all text-sm ${
                  voice === v.id
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
                disabled={loading}
              >
                <p className="font-semibold">{v.label}</p>
                <p className="text-xs text-gray-400">{v.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <MaterialInput
          onSubmit={handleGenerate}
          loading={loading}
          buttonLabel="Generar audio"
        />
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {playing && (
        <div className="card mb-8 bg-gradient-to-r from-primary-50 to-indigo-50 border-primary-200 sticky top-20 z-40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1 min-w-0 mr-4">
              <p className="font-bold text-gray-900 truncate">{playing.title}</p>
              <p className="text-xs text-gray-500">Voz: {playing.voice}</p>
            </div>
            <button
              onClick={stopAudio}
              className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors shrink-0"
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={audioDuration || 1}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #4f46e5 ${
                    (currentTime / (audioDuration || 1)) * 100
                  }%, #e5e7eb ${(currentTime / (audioDuration || 1)) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(audioDuration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 mr-1">Velocidad:</span>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeed(s)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                    speed === s
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowScript(!showScript)}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              {showScript ? "Ocultar guión" : "Ver guión"}
            </button>
          </div>

          {showScript && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {playing.script}
              </p>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mis audios</h2>

        {loadingAudios ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : audios.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500">
              No tenés audios todavía. Generá uno arriba con tu material de estudio.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {audios.map((audio) => (
              <div
                key={audio.id}
                className={`card hover:shadow-md transition-all ${
                  playing?.id === audio.id ? "ring-2 ring-primary-500" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() =>
                      playing?.id === audio.id ? togglePlayPause() : playAudio(audio)
                    }
                    className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center hover:bg-primary-200 transition-colors shrink-0"
                  >
                    {playing?.id === audio.id && isPlaying ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {audio.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      ~{formatDuration(audio.duration)} &middot; Voz: {audio.voice} &middot;{" "}
                      {new Date(audio.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(audio.id)}
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
