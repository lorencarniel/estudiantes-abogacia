"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MaterialInput from "@/components/MaterialInput";

interface Slide {
  slideTitle: string;
  bullets: string[];
  narration: string;
  wordCount: number;
  startTime: number;
  endTime: number;
}

interface VideoItem {
  id: string;
  title: string;
  slides: Slide[];
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

const SLIDE_COLORS = [
  "from-blue-600 to-indigo-700",
  "from-indigo-600 to-purple-700",
  "from-purple-600 to-pink-700",
  "from-teal-600 to-cyan-700",
  "from-emerald-600 to-teal-700",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700",
  "from-violet-600 to-indigo-700",
];

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

export default function VideosPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState("nova");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showNarration, setShowNarration] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/videos");
      const data = await res.json();
      if (data.videos) setVideos(data.videos);
    } catch { /* ignore */ }
    setLoadingVideos(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchVideos();
  }, [status, fetchVideos]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!activeVideo || !isPlaying) return;
    const slide = activeVideo.slides.findIndex(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );
    if (slide !== -1 && slide !== currentSlide) {
      setCurrentSlide(slide);
    }
  }, [currentTime, activeVideo, currentSlide, isPlaying]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!activeVideo) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        goToSlide(Math.min(currentSlide + 1, activeVideo.slides.length - 1));
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        goToSlide(Math.max(currentSlide - 1, 0));
      } else if (e.code === "Escape") {
        if (isFullscreen) setIsFullscreen(false);
        else closePlayer();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  async function handleGenerate(text: string, syllabusId?: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, syllabusId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al generar video");
      } else {
        const newVideo: VideoItem = {
          id: data.id,
          title: data.title,
          slides: data.slides,
          duration: data.duration,
          voice: data.voice,
          createdAt: new Date().toISOString(),
        };
        setVideos((prev) => [newVideo, ...prev]);
        openPlayer(newVideo);
      }
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  }

  function openPlayer(video: VideoItem) {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`/api/videos/${video.id}/stream`);
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

    setActiveVideo(video);
    setCurrentSlide(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowNarration(false);
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

  function goToSlide(index: number) {
    if (!activeVideo || !audioRef.current) return;
    const slide = activeVideo.slides[index];
    if (!slide) return;
    audioRef.current.currentTime = slide.startTime;
    setCurrentTime(slide.startTime);
    setCurrentSlide(index);
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

  function closePlayer() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setActiveVideo(null);
    setIsPlaying(false);
    setIsFullscreen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este video?")) return;
    await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
    setVideos((prev) => prev.filter((v) => v.id !== id));
    if (activeVideo?.id === id) closePlayer();
  }

  if (activeVideo) {
    const slide = activeVideo.slides[currentSlide];
    const colorClass = SLIDE_COLORS[currentSlide % SLIDE_COLORS.length];
    const progress =
      audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    const playerContent = (
      <div
        ref={playerRef}
        className={`flex flex-col ${
          isFullscreen ? "fixed inset-0 z-50" : "min-h-[70vh]"
        } bg-gray-900 rounded-xl overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-gray-950/50">
          <div className="flex items-center gap-3">
            <button
              onClick={closePlayer}
              className="text-gray-400 hover:text-white text-sm"
            >
              ✕ Cerrar
            </button>
            <span className="text-gray-500 text-sm truncate max-w-[200px]">
              {activeVideo.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">
              {currentSlide + 1} / {activeVideo.slides.length}
            </span>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-gray-400 hover:text-white p-1"
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m7 1l5-5m0 0v4m0-4h-4m-7 15l-5 5m0 0v-4m0 4h4m7-1l5 5m0 0v-4m0 4h-4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className={`w-full max-w-3xl bg-gradient-to-br ${colorClass} rounded-2xl p-8 md:p-12 shadow-2xl transition-all duration-500`}
          >
            <div className="text-white/60 text-sm mb-4 font-medium">
              Diapositiva {currentSlide + 1}
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-6 leading-tight">
              {slide.slideTitle}
            </h2>
            <ul className="space-y-3">
              {slide.bullets.map((bullet, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-white/90 text-base md:text-lg"
                >
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-white/50 shrink-0" />
                  {bullet}
                </li>
              ))}
            </ul>

            {showNarration && (
              <div className="mt-6 pt-4 border-t border-white/20">
                <p className="text-white/70 text-sm leading-relaxed italic">
                  {slide.narration}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-2 pb-2">
          {activeVideo.slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentSlide
                  ? "bg-white scale-125"
                  : idx < currentSlide
                  ? "bg-white/50"
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>

        <div className="px-4 pb-4">
          <div className="relative w-full h-1.5 bg-gray-700 rounded-full mb-3 cursor-pointer">
            <input
              type="range"
              min={0}
              max={audioDuration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
            {activeVideo.slides.map((s, idx) => {
              if (idx === 0) return null;
              const pct = audioDuration > 0 ? (s.startTime / audioDuration) * 100 : 0;
              return (
                <div
                  key={idx}
                  className="absolute top-0 w-0.5 h-full bg-gray-500"
                  style={{ left: `${pct}%` }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToSlide(Math.max(currentSlide - 1, 0))}
                className="text-gray-400 hover:text-white p-1.5"
                disabled={currentSlide === 0}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>
              <button
                onClick={togglePlayPause}
                className="w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center hover:bg-gray-200 transition-colors"
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
              <button
                onClick={() =>
                  goToSlide(
                    Math.min(currentSlide + 1, activeVideo.slides.length - 1)
                  )
                }
                className="text-gray-400 hover:text-white p-1.5"
                disabled={currentSlide === activeVideo.slides.length - 1}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
              <span className="text-gray-500 text-xs ml-2">
                {formatTime(currentTime)} / {formatTime(audioDuration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNarration(!showNarration)}
                className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                  showNarration
                    ? "bg-primary-600 text-white"
                    : "bg-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                Guión
              </button>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeed(s)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                    speed === s
                      ? "bg-primary-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:text-white"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );

    if (isFullscreen) {
      return playerContent;
    }

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {playerContent}
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
        <span className="text-3xl">🎬</span>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Videos explicativos
        </h1>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        La IA genera diapositivas con narración para que estudies como en una
        clase. Cada video tiene slides sincronizados con audio explicativo.
      </p>

      <div className="card mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Generar video</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voz del narrador
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
          buttonLabel="🎬 Generar video"
        />
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="card mb-8 text-center py-12">
          <div className="relative inline-block mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl">
              🎬
            </span>
          </div>
          <p className="text-gray-600 font-medium">
            Generando diapositivas y audio...
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Esto puede tomar hasta 30 segundos
          </p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Mis videos</h2>

        {loadingVideos ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : videos.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-4xl mb-3">🎥</p>
            <p className="text-gray-500">
              No tenés videos todavía. Generá uno con tu material de estudio.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video) => (
              <div
                key={video.id}
                className="card hover:shadow-md transition-all cursor-pointer"
                onClick={() => openPlayer(video)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {video.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {video.slides.length} slides &middot;{" "}
                      ~{formatDuration(video.duration)} &middot; Voz:{" "}
                      {video.voice} &middot;{" "}
                      {new Date(video.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(video.id);
                    }}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
