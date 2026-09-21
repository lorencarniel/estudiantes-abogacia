"use client";

import { useEffect, useState } from "react";

interface Topic {
  title: string;
  overallScore: number;
  totalAttempts: number;
}

export default function WeakAreas() {
  const [weakTopics, setWeakTopics] = useState<Topic[]>([]);

  useEffect(() => {
    fetch("/api/stats/topics")
      .then((r) => r.json())
      .then((data) => {
        if (data.topics) {
          setWeakTopics(
            data.topics
              .filter((t: Topic) => t.overallScore < 60 && t.totalAttempts >= 1)
              .slice(0, 5)
          );
        }
      })
      .catch(() => {});
  }, []);

  if (weakTopics.length === 0) return null;

  return (
    <div className="card mb-6 border-l-4 border-l-amber-500">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">⚠️</span>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Áreas para repasar
        </h2>
      </div>
      <div className="space-y-2">
        {weakTopics.map((topic) => (
          <div
            key={topic.title}
            className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
              {topic.title}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {topic.totalAttempts} intento{topic.totalAttempts !== 1 ? "s" : ""}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  topic.overallScore < 40
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                }`}
              >
                {topic.overallScore}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
