# 009 - Mejoras Avanzadas

## Features a implementar

### 1. Estadísticas por tema/materia
- Nuevo endpoint `GET /api/stats/topics` que agrupa quiz y game results por `sourceText` (primeros 100 chars como key)
- En la página de stats, nueva sección "Rendimiento por tema" con barras de acierto por tema
- Archivos: `src/app/api/stats/topics/route.ts` (nuevo), `src/app/stats/page.tsx` (modificar)

### 2. Detección de áreas débiles
- En el endpoint de topics, calcular temas con < 60% de acierto
- Componente `WeakAreas` que muestra los 5 temas más débiles con sugerencia de repasar
- Integrar en dashboard debajo del XPBar
- Archivos: `src/components/WeakAreas.tsx` (nuevo), `src/app/dashboard/page.tsx` (modificar)

### 3. Highlighter inteligente
- Nuevo endpoint `POST /api/ai/highlight` que recibe texto y devuelve las frases/conceptos clave resaltados
- Prompt de IA que identifica: definiciones, artículos de ley, principios jurídicos, jurisprudencia
- Componente `HighlightedText` que muestra el texto con highlights por categoría (colores distintos)
- Nueva página `/tools/highlighter`
- Archivos: `src/app/api/ai/highlight/route.ts`, `src/lib/prompts.ts`, `src/app/tools/highlighter/page.tsx` (nuevos)

### 4. Onboarding flow
- Modal de bienvenida para usuarios nuevos (primera vez en dashboard)
- 3 pasos: bienvenida, seleccionar materias de interés, tip de cómo usar la app
- Guardado en Profile (nuevo campo `onboardingDone`)
- Archivos: `src/components/OnboardingModal.tsx` (nuevo), `prisma/schema.prisma`, `src/app/dashboard/page.tsx`

### 5. Responsive polish
- Theme toggle en mobile menu del Navbar
- Mejorar touch targets en mobile (min 44px)
- Revisar que los tool cards del dashboard se vean bien en mobile
- Ajustar tipografía responsive donde falte
- Archivos: `src/components/Navbar.tsx`, varios ajustes menores
