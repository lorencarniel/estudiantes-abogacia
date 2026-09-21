"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PomodoroTimer from "@/components/PomodoroTimer";
import XPBar from "@/components/XPBar";
import WeakAreas from "@/components/WeakAreas";
import OnboardingModal from "@/components/OnboardingModal";

const tools = [
  {
    icon: "🗺️",
    title: "Mapas conceptuales",
    description: "Generá mapas interactivos a partir de tus apuntes o PDFs.",
    href: "/tools/maps",
    available: true,
  },
  {
    icon: "📝",
    title: "Cuestionarios",
    description: "Simulacros de examen con corrección automática.",
    href: "/tools/quizzes",
    available: true,
  },
  {
    icon: "📄",
    title: "Resúmenes",
    description: "Resúmenes con distintos niveles de profundidad.",
    href: "/tools/summaries",
    available: true,
  },
  {
    icon: "📊",
    title: "Esquemas",
    description: "Esquemas jerárquicos organizados por secciones.",
    href: "/tools/outlines",
    available: true,
  },
  {
    icon: "🃏",
    title: "Flashcards",
    description: "Tarjetas de memoria con repetición espaciada.",
    href: "/tools/flashcards",
    available: true,
  },
  {
    icon: "📅",
    title: "Cronogramas",
    description: "Planificación de estudio personalizada por IA.",
    href: "/tools/schedules",
    available: true,
  },
  {
    icon: "🎧",
    title: "Audios",
    description: "Explicaciones en audio tipo clase para escuchar donde sea.",
    href: "/tools/audios",
    available: true,
  },
  {
    icon: "🎮",
    title: "Juegos",
    description: "Trivia y verdadero/falso para repasar jugando.",
    href: "/tools/games",
    available: true,
  },
  {
    icon: "🎬",
    title: "Videos",
    description: "Diapositivas narradas con audio para aprender como en clase.",
    href: "/tools/videos",
    available: true,
  },
  {
    icon: "📋",
    title: "Programas",
    description: "Cargá el programa oficial de cada materia para guiar a la IA.",
    href: "/tools/syllabus",
    available: true,
  },
  {
    icon: "📂",
    title: "Mis apuntes",
    description: "Guardá tus apuntes para reutilizarlos en cualquier herramienta.",
    href: "/tools/materials",
    available: true,
  },
  {
    icon: "⚖️",
    title: "Comparador",
    description: "Compará conceptos similares que se prestan a confusión.",
    href: "/tools/compare",
    available: true,
  },
  {
    icon: "💬",
    title: "Chat con el apunte",
    description: "Hacé preguntas libres sobre tu material y recibí respuestas.",
    href: "/tools/chat",
    available: true,
  },
  {
    icon: "📋",
    title: "Casos prácticos",
    description: "Resolvé casos jurídicos generados por IA con corrección.",
    href: "/tools/practical-cases",
    available: true,
  },
  {
    icon: "🎤",
    title: "Simulacro oral",
    description: "Practicá para el examen oral con preguntas y evaluación.",
    href: "/tools/oral-exam",
    available: true,
  },
  {
    icon: "🧠",
    title: "Mnemotécnicos",
    description: "Generá reglas mnemotécnicas para memorizar conceptos difíciles.",
    href: "/tools/mnemonics",
    available: true,
  },
  {
    icon: "📚",
    title: "Glosario",
    description: "Extraé un glosario de términos jurídicos de tus apuntes.",
    href: "/tools/glossary",
    available: true,
  },
  {
    icon: "🖍️",
    title: "Resaltador",
    description: "Identificá automáticamente frases y conceptos clave.",
    href: "/tools/highlighter",
    available: true,
  },
];

const TYPE_ICONS: Record<string, string> = {
  summary: "📄",
  outline: "📊",
  concept_map: "🗺️",
  quiz: "📝",
  flashcard_deck: "🃏",
  schedule: "📅",
  audio: "🎧",
  game: "🎮",
  video: "🎬",
  comparison: "⚖️",
  practical_case: "📋",
  oral_exam: "🎤",
  mnemonic: "🧠",
  glossary: "📚",
  highlight: "🖍️",
};

const TYPE_LABELS: Record<string, string> = {
  summary: "Resumen",
  outline: "Esquema",
  concept_map: "Mapa conceptual",
  quiz: "Cuestionario",
  flashcard_deck: "Flashcards",
  schedule: "Cronograma",
  audio: "Audio",
  game: "Juego",
  video: "Video",
  comparison: "Comparación",
  practical_case: "Caso práctico",
  oral_exam: "Examen oral",
  mnemonic: "Mnemotécnico",
  glossary: "Glosario",
  highlight: "Resaltador",
};

interface RecentItem {
  id: string;
  type: string;
  title: string;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Recién";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

interface QuickStats {
  totalItems: number;
  studyStreak: number;
  quizzes: { total: number; passed: number; avgScore: number };
  games: { bestStreak: number };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.profile && !data.profile.onboardingDone) setShowOnboarding(true);
          if (!data.profile) setShowOnboarding(true);
        })
        .catch(() => {});
      fetch("/api/history")
        .then((r) => r.json())
        .then((data) => {
          if (data.items) setRecent(data.items.slice(0, 5));
        })
        .catch(() => {});
      fetch("/api/stats")
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setStats(data);
        })
        .catch(() => {});
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Hola, {session.user.name?.split(" ")[0] || "estudiante"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Elegí una herramienta para empezar a estudiar
        </p>
      </div>

      <XPBar />

      <WeakAreas />

      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      {showPomodoro && (
        <div className="mb-6 max-w-sm mx-auto">
          <PomodoroTimer onClose={() => setShowPomodoro(false)} />
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowPomodoro(!showPomodoro)}
          className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 transition-colors">
          <span>🍅</span> {showPomodoro ? "Ocultar Pomodoro" : "Modo Pomodoro"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div
            key={tool.title}
            className={`card hover:shadow-md transition-shadow ${
              !tool.available ? "opacity-60" : ""
            }`}
          >
            <div className="text-3xl mb-3">{tool.icon}</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {tool.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{tool.description}</p>
            {tool.available ? (
              <Link href={tool.href} className="btn-primary inline-block text-sm py-2 px-4">
                Usar herramienta
              </Link>
            ) : (
              <span className="inline-block text-sm text-gray-400 font-medium bg-gray-100 px-3 py-1.5 rounded-lg">
                Próximamente
              </span>
            )}
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Actividad reciente</h2>
            <Link href="/history" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              Ver todo el historial &rarr;
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((item) => (
              <Link
                key={item.id}
                href="/history"
                className="card flex items-center gap-4 py-3 hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">{TYPE_ICONS[item.type] || "📄"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-400">
                    {TYPE_LABELS[item.type] || item.type} &middot; {timeAgo(item.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {stats && stats.totalItems > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tu progreso</h2>
            <Link href="/stats" className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              Ver estadísticas &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card py-4 text-center">
              <p className="text-2xl font-bold text-primary-600">{stats.totalItems}</p>
              <p className="text-xs text-gray-500 mt-1">Material generado</p>
            </div>
            <div className="card py-4 text-center">
              <p className="text-2xl font-bold text-orange-600">
                {stats.studyStreak > 0 ? `🔥 ${stats.studyStreak}` : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Racha de estudio</p>
            </div>
            <div className="card py-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {stats.quizzes.total > 0 ? `${stats.quizzes.avgScore}%` : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Promedio quizzes</p>
            </div>
            <div className="card py-4 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.games.bestStreak > 0 ? `🔥 ${stats.games.bestStreak}` : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1">Mejor racha juegos</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
