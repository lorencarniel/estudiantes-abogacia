# EstudioJuridico - Plataforma de estudio con IA para Abogacia

## Stack

- **Framework**: Next.js 14, App Router, TypeScript
- **Estilos**: Tailwind CSS (mobile-first)
- **ORM**: Prisma con SQLite (JSON como String, JSON.stringify/JSON.parse manual)
- **Auth**: NextAuth v4, Credentials provider, JWT, sesion 30 dias
- **IA**: OpenAI API (gpt-4o-mini), TTS (tts-1)
- **Algoritmo**: SM-2 para repeticion espaciada en flashcards

## Convenciones

- Idioma de la UI y prompts: espanol argentino (voseo)
- Nombres de archivos y variables: ingles
- Mensajes de commit: espanol
- Todos los prompts de IA usan `SYSTEM_PROMPT` de `src/lib/ai.ts`
- Los prompts marcan el contenido del usuario como `<apunte>` (datos no confiables)
- Los campos JSON en Prisma/SQLite se guardan como String y se parsean manualmente
- No usar `pdf-parse` directo, usar `require("pdf-parse/lib/pdf-parse")` por bug del test file
- Archivos de audio se guardan en `storage/audios/` y se sirven via API autenticada
- El `.env` contiene la API key real de OpenAI — NUNCA commitear `.env` ni `.env.local`

## Estructura del proyecto

```
src/
  app/
    api/ai/       # Rutas de generacion con OpenAI (quiz, summary, outline, etc)
    api/           # Rutas CRUD (history, stats, games, videos, etc)
    tools/         # Paginas de cada herramienta
    auth/          # Login y registro
    dashboard/     # Panel principal
    stats/         # Estadisticas
    history/       # Historial
  components/      # Componentes compartidos
  lib/             # ai.ts, auth.ts, prisma.ts, prompts.ts
prisma/            # Schema de la base de datos
storage/           # Archivos generados (audio mp3) — NO commitear
```

## Comandos

- `npm run dev` — servidor de desarrollo
- `npx prisma db push` — aplicar cambios al schema (parar dev server antes)
- `npx prisma studio` — UI para ver la base de datos
- `npx tsc --noEmit` — verificar tipos

## OpenSpec - Metodologia de trabajo

Toda tarea nueva (feature, fix, refactor) sigue el flujo OpenSpec de 4 fases.
Las specs se guardan en `specs/` con nombre descriptivo.

### 1. Explore

- Investigar el codebase, leer archivos relevantes, entender el problema
- Documentar hallazgos en `specs/NNN-nombre/explore.md`
- NO escribir codigo en esta fase

### 2. Propose

- Escribir la propuesta detallada en `specs/NNN-nombre/propose.md`
- Incluir: objetivo, archivos a modificar, cambios especificos, riesgos
- Esperar confirmacion del usuario antes de continuar

### 3. Apply

- Implementar los cambios segun la spec aprobada
- Verificar con `npx tsc --noEmit` y en el browser
- Commitear con mensaje descriptivo

### 4. Archive

- Mover o marcar la spec como completada
- Actualizar `specs/NNN-nombre/archive.md` con resultado final
- Push al repositorio

### Reglas

- Nunca saltear fases
- Siempre esperar confirmacion en Propose antes de Apply
- Cada spec tiene su carpeta numerada: `specs/001-nombre/`
- El archivo `specs/INDEX.md` mantiene el indice de todas las specs
