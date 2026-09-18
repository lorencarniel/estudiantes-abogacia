# Spec 001 — Archive

## Estado: COMPLETADA

## Fecha: 2026-09-18

## Resumen

Se implementaron las dos features planificadas:

### 1. Selector de tipo de examen (parcial/final/libre)
- Agregado en la pagina de **Cuestionarios** junto al selector de dificultad
- Agregado en la pagina de **Juegos** antes del MaterialInput
- Cada tipo tiene instrucciones especificas para la IA en `src/lib/prompts.ts`
- Se guarda en la DB (`examType` en QuizAttempt y GameSession)

### 2. Programas de materia (syllabus)
- Nuevo modelo `Syllabus` en Prisma
- API CRUD en `/api/syllabus` (GET, POST, DELETE)
- Pagina de gestion en `/tools/syllabus`
- Selector de programa integrado en `MaterialInput` (aparece en todas las herramientas)
- Todos los prompts de IA aceptan contenido del programa via tags `<programa>`
- Todas las rutas API aceptan `syllabusId` para cargar el programa

## Archivos modificados/creados

### Nuevos
- `prisma/schema.prisma` — modelo Syllabus, campos examType
- `src/app/api/syllabus/route.ts` — CRUD API
- `src/app/tools/syllabus/page.tsx` — UI de gestion
- `specs/001-exam-type-y-cronograma/explore.md`
- `specs/001-exam-type-y-cronograma/propose.md`
- `specs/001-exam-type-y-cronograma/archive.md`

### Modificados
- `src/lib/prompts.ts` — ExamType, EXAM_TYPE_INSTRUCTIONS, syllabusBlock()
- `src/components/MaterialInput.tsx` — selector de programa, nueva firma onSubmit
- `src/app/dashboard/page.tsx` — enlace a Programas
- `src/app/tools/quizzes/page.tsx` — selector examType + syllabusId
- `src/app/tools/games/page.tsx` — selector examType + syllabusId
- `src/app/tools/summaries/page.tsx` — syllabusId
- `src/app/tools/outlines/page.tsx` — syllabusId
- `src/app/tools/flashcards/page.tsx` — syllabusId
- `src/app/tools/audios/page.tsx` — syllabusId
- `src/app/tools/videos/page.tsx` — syllabusId
- `src/app/tools/maps/page.tsx` — syllabusId
- Todas las rutas API en `src/app/api/ai/` — syllabusId lookup

## Verificacion
- TypeScript compila sin errores (`npx tsc --noEmit`)
- Verificado en browser: dashboard, quizzes, games, syllabus
- Push exitoso a GitHub
