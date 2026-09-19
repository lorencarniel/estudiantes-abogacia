"use client";

import { useEffect, useState } from "react";

interface XPData {
  level: number;
  name: string;
  totalXP: number;
  xpInLevel: number;
  xpForNext: number;
  progress: number;
  nextLevelName: string | null;
  streak?: number;
}

export default function XPBar() {
  const [xp, setXP] = useState<XPData | null>(null);

  useEffect(() => {
    fetch("/api/xp")
      .then(r => r.json())
      .then(data => { if (!data.error) setXP(data); })
      .catch(() => {});
  }, []);

  if (!xp) return null;

  return (
    <div className="card py-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
          {xp.level}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-white">{xp.name}</span>
              {xp.streak && xp.streak > 0 && (
                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full font-semibold">
                  🔥 {xp.streak} días
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{xp.totalXP} XP</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${xp.progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">Nivel {xp.level}</span>
            {xp.nextLevelName && (
              <span className="text-xs text-gray-400">{xp.xpInLevel}/{xp.xpForNext} XP para {xp.nextLevelName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
