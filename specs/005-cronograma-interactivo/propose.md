# Spec 005 - Cronograma interactivo con herramientas — Propose

## Objetivo
Hacer que cada bloque del cronograma sea accionable: un botón "Estudiar" que lleva a la herramienta correcta con el apunte pre-cargado.

## Cambios

### 1. Modificar `src/app/tools/schedules/page.tsx`
- Agregar botón "Estudiar" en cada bloque del cronograma
- Mapear actividad a ruta de herramienta:
  - leer → `/tools/summaries`
  - resumir → `/tools/outlines`
  - practicar → `/tools/quizzes`
  - repasar → `/tools/flashcards`
- Navegar con query param `?subject=NombreTema`

### 2. Crear hook `src/hooks/useAutoLoadMaterial.ts`
- Hook reutilizable que lee `?subject=` de la URL
- Busca en `/api/materials` un apunte cuyo título contenga el tema
- Si encuentra, carga el contenido via `/api/materials/[id]`
- Retorna `{ text, loading, subjectName }`

### 3. Modificar las 4 páginas de herramientas destino
- `/tools/summaries/page.tsx`
- `/tools/outlines/page.tsx`
- `/tools/quizzes/page.tsx`
- `/tools/flashcards/page.tsx`
- Usar `useAutoLoadMaterial()` para pre-cargar material
- Si hay material pre-cargado, ejecutar la generación automáticamente

## Riesgos
- Si el usuario no tiene apuntes guardados del tema, no pasa nada: se muestra la UI normal
- El match de nombre es por coincidencia parcial (case-insensitive)
