"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProfileData {
  university: string;
  careerYear: number | null;
  subjects: string[];
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>({
    university: "",
    careerYear: null,
    subjects: [],
  });
  const [subjectInput, setSubjectInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.profile) {
            setProfile({
              university: data.profile.university || "",
              careerYear: data.profile.careerYear,
              subjects: data.profile.subjects || [],
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function addSubject() {
    const trimmed = subjectInput.trim();
    if (trimmed && !profile.subjects.includes(trimmed)) {
      setProfile({ ...profile, subjects: [...profile.subjects, trimmed] });
      setSubjectInput("");
    }
  }

  function removeSubject(subject: string) {
    setProfile({
      ...profile,
      subjects: profile.subjects.filter((s) => s !== subject),
    });
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Tu perfil</h1>
      <p className="text-gray-600 mb-8">
        Completá tu perfil para personalizar tu experiencia de estudio
      </p>

      <form onSubmit={handleSave} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre
          </label>
          <input
            type="text"
            className="input-field bg-gray-50"
            value={session.user.name || ""}
            disabled
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            className="input-field bg-gray-50"
            value={session.user.email || ""}
            disabled
          />
        </div>

        <div>
          <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-1">
            Universidad / Facultad
          </label>
          <input
            id="university"
            type="text"
            className="input-field"
            placeholder="Ej: UBA - Facultad de Derecho"
            value={profile.university}
            onChange={(e) => setProfile({ ...profile, university: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="careerYear" className="block text-sm font-medium text-gray-700 mb-1">
            Año de la carrera
          </label>
          <select
            id="careerYear"
            className="input-field"
            value={profile.careerYear ?? ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                careerYear: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Seleccioná tu año</option>
            {[1, 2, 3, 4, 5, 6].map((y) => (
              <option key={y} value={y}>
                {y}° año
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Materias que estás cursando
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field"
              placeholder="Ej: Derecho Civil"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubject();
                }
              }}
            />
            <button type="button" onClick={addSubject} className="btn-secondary whitespace-nowrap">
              Agregar
            </button>
          </div>
          {profile.subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {profile.subjects.map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center gap-1 bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {subject}
                  <button
                    type="button"
                    onClick={() => removeSubject(subject)}
                    className="text-primary-600 hover:text-red-600 ml-1"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
          {saved && (
            <span className="text-green-600 font-medium text-sm">
              Perfil guardado correctamente
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
