"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface AutoLoadResult {
  text: string | null;
  loading: boolean;
  subjectName: string | null;
}

export function useAutoLoadMaterial(): AutoLoadResult {
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject");
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!subject);

  useEffect(() => {
    if (!subject) return;

    async function loadMaterial() {
      try {
        const res = await fetch("/api/materials");
        const data = await res.json();
        if (!data.materials?.length) { setLoading(false); return; }

        const lower = subject!.toLowerCase();
        const match = data.materials.find((m: { title: string }) =>
          m.title.toLowerCase().includes(lower) || lower.includes(m.title.toLowerCase())
        );

        if (match) {
          const detail = await fetch(`/api/materials/${match.id}`);
          const mat = await detail.json();
          if (mat.content) setText(mat.content);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }

    loadMaterial();
  }, [subject]);

  return { text, loading, subjectName: subject };
}
