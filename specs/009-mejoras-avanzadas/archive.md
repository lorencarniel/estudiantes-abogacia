# Spec 009 — Mejoras avanzadas

## Estado: COMPLETADA

## Fecha: 2026-09-20

## Resumen

Se implementaron 5 mejoras avanzadas para la plataforma:

### 1. Estadísticas por tema
- **API** `/api/stats/topics`: agrupa QuizAttempts y GameSessions por título, calcula promedios y puntaje general
- **Stats page**: sección "Rendimiento por tema" con barras de progreso coloreadas (rojo < 40%, ámbar < 60%, amarillo < 80%, verde >= 80%)

### 2. Detección de áreas débiles
- **Componente** `WeakAreas`: muestra hasta 5 temas con score < 60% en el dashboard
- Badges de color según gravedad (rojo/ámbar)

### 3. Resaltador inteligente
- **Prompt** `highlightPrompt` + `highlightSchema` en prompts.ts
- **API** `/api/ai/highlight`: genera highlights categorizados (definición, artículo, principio, jurisprudencia, concepto clave, ejemplo)
- **Página** `/tools/highlighter`: input de material, filtros por categoría, highlights expandibles con notas e importancia
- Integrado en dashboard (tool card), historial (TYPE_META), TYPE_ICONS/LABELS

### 4. Flujo de onboarding
- **Componente** `OnboardingModal`: 3 pasos (bienvenida, selección de materias, tips de uso)
- **Schema** Prisma: campo `onboardingDone` en Profile
- **API** profile: soporte para `onboardingDone` en zod schema y PUT handler
- Se muestra automáticamente en el dashboard para usuarios nuevos

### 5. Polish responsive
- `min-h-[44px]` en `.btn-primary` y `.btn-secondary` para touch targets adecuados
- Toggle de tema (dark/light) en menú mobile del Navbar
- Chips de materias con `min-h-[44px]` en onboarding

## Archivos creados
- `src/app/api/stats/topics/route.ts`
- `src/app/api/ai/highlight/route.ts`
- `src/app/tools/highlighter/page.tsx`
- `src/components/WeakAreas.tsx`
- `src/components/OnboardingModal.tsx`

## Archivos modificados
- `prisma/schema.prisma` (campo onboardingDone)
- `src/lib/prompts.ts` (highlightPrompt, highlightSchema)
- `src/app/api/profile/route.ts` (onboardingDone en zod + data)
- `src/app/dashboard/page.tsx` (WeakAreas, OnboardingModal, highlighter card, highlight types)
- `src/app/history/page.tsx` (highlight TYPE_META)
- `src/app/stats/page.tsx` (topic performance section)
- `src/components/Navbar.tsx` (theme toggle mobile)
- `src/app/globals.css` (min-h-[44px] buttons)
