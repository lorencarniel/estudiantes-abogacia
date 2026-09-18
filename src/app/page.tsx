import Link from "next/link";

const features = [
  {
    icon: "🗺️",
    title: "Mapas conceptuales",
    description: "Generados por IA a partir de tus apuntes, editables e interactivos.",
  },
  {
    icon: "📝",
    title: "Cuestionarios",
    description: "Simulacros de examen con corrección automática y explicaciones.",
  },
  {
    icon: "📄",
    title: "Resúmenes",
    description: "Resúmenes a distintos niveles de profundidad, con conceptos clave resaltados.",
  },
  {
    icon: "🃏",
    title: "Flashcards",
    description: "Tarjetas de memoria con repetición espaciada para optimizar tu repaso.",
  },
  {
    icon: "🎧",
    title: "Audios explicativos",
    description: "Escuchá tus temas explicados como en una clase, donde quieras.",
  },
  {
    icon: "📅",
    title: "Cronogramas",
    description: "Planificación de estudio personalizada según tu examen y tiempo disponible.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <p className="text-primary-200 font-semibold text-sm uppercase tracking-wider mb-4">
              Plataforma de estudio con IA
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Transformá tus apuntes en herramientas de estudio
            </h1>
            <p className="text-xl text-primary-100 mb-8 leading-relaxed">
              Subí tus PDFs, apuntes o fallos y la IA genera mapas
              conceptuales, cuestionarios, resúmenes, flashcards y mucho más.
              Diseñada para estudiantes de Abogacía.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth/register"
                className="bg-white text-primary-800 px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary-50 transition-colors text-center"
              >
                Empezar gratis
              </Link>
              <Link
                href="/auth/login"
                className="border-2 border-white/30 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors text-center"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Todo lo que necesitás para estudiar
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Herramientas potenciadas por inteligencia artificial, pensadas
            para la carrera de Abogacía.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="card hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {f.title}
              </h3>
              <p className="text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-2xl mb-2">&#9878;</p>
          <p className="font-semibold text-white">EstudioJurídico</p>
          <p className="text-sm mt-2">
            Plataforma de estudio con IA para estudiantes de Abogacía
          </p>
        </div>
      </footer>
    </div>
  );
}
