"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stats", label: "Estadísticas" },
  { href: "/history", label: "Historial" },
  { href: "/profile", label: "Perfil" },
];

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + "/");
  }

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50" role="navigation" aria-label="Navegación principal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">&#9878;</span>
              <span className="font-bold text-xl text-primary-900 dark:text-primary-100">
                EstudioJurídico
              </span>
            </Link>
          </div>

          {session ? (
            <>
              <div className="hidden sm:flex items-center gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:text-primary-700 hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-2" />
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
                >
                  {theme === "dark" ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 font-medium transition-colors"
                >
                  Salir
                </button>
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold ml-2">
                  {session.user.name?.charAt(0).toUpperCase() || "U"}
                </div>
              </div>

              <div className="sm:hidden flex items-center">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 text-gray-600 rounded-lg hover:bg-gray-50"
                  aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                  aria-expanded={menuOpen}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {menuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-primary-700 font-medium transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/auth/register"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium transition-colors"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>

      {menuOpen && session && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-2 px-3 rounded-lg font-medium ${
                  isActive(link.href)
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block py-2 px-3 text-red-600 font-medium w-full text-left"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
