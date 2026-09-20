# 008 - Auditoría Integral

## Estado: COMPLETADO

## Objetivo
Auditoría completa de la app: seguridad API, calidad UI (dark mode), y prompts IA.

## Hallazgos y correcciones

### Seguridad API (14 archivos, 20 cambios)
- **JSON.parse sin protección**: 14 llamadas reemplazadas por `safeJsonParse` (nuevo util en `src/lib/utils.ts`) en history, stats, schedules, videos, profile, quiz
- **Try/catch faltante**: 30 handlers en 14 rutas envueltos con try/catch y respuesta 500 en español
- **Path traversal**: sanitización con `path.basename()` en stream de audio/video y DELETE de videos
- **Inyección de system prompt**: filtrado de roles en chat route (solo "user" y "assistant")
- **Validación de input**: score/streak validados con rango y tipo en game complete

### Dark Mode (22 archivos, ~460 cambios)
- `btn-secondary` en globals.css: agregado dark variant
- `MaterialInput`: dark mode completo (usado en ~15 páginas)
- 15 páginas de herramientas: headings, labels, borders, backgrounds
- Stats, history, profile: todos los elementos con dark variants
- ConceptMapEditor: botones, leyenda, instrucciones
- Crossword cells: visibilidad corregida (bg-white → dark:bg-gray-800)
- Barras de progreso: bg-gray-100 → dark:bg-gray-700

### Prompts IA (hallazgos menores)
- schedulePrompt no incluye BASE_RULES (bajo riesgo)
- Campos de score como "number" en vez de "integer" en schemas (cosmético)

## Archivos nuevos
- `src/lib/utils.ts` — safeJsonParse helper

## Commits
- `fix: seguridad y robustez en rutas API` (20 archivos)
- `feat: dark mode completo en toda la app` (22 archivos)
