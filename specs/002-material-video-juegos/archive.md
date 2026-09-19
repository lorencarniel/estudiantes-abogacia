# Spec 002 — Archive

## Estado: COMPLETADA

## Resumen de cambios

### Bloque A — Persistencia de material
- Nuevo modelo `Material` en Prisma (id, userId, title, fileName, content, charCount)
- API CRUD: `GET/POST/DELETE /api/materials` + `GET /api/materials/[id]`
- MaterialInput ahora tiene 3 pestañas: "Pegar texto", "Subir archivo", "Mis apuntes"
- Página de gestión `/tools/materials` con lista, agregar y eliminar
- Card en el dashboard para acceder a "Mis apuntes"

### Bloque B — Fix video TTS
- Problema: OpenAI TTS tiene límite de 4096 caracteres. Al concatenar todas las narraciones, solo se generaba audio para la primera diapositiva.
- Solución: generar TTS por diapositiva individual, concatenar buffers MP3, calcular duración real por slide.

### Bloque C — Juegos interactivos creativos
- 3 nuevos tipos de juego:
  - **Relacionar** (matching): 8 pares concepto-definición, columnas lado a lado
  - **Ordenar** (ordering): 6 items para poner en secuencia correcta con flechas arriba/abajo
  - **Completar** (fill_blank): 8 oraciones con espacios en blanco, pistas, explicaciones
- GAME_REGISTRY pattern para dispatch limpio de tipos
- Nuevos prompts y schemas en `prompts.ts`
- Pantalla de resultados adaptada para juegos interactivos

### Bloque D — Mejora mapas conceptuales
- Nodos con ancho dinámico según longitud del texto
- Mayor espaciado entre nodos (nodesep: 120, ranksep: 160)
- Bordes tipo smoothstep en lugar de default
- Prompt mejorado para estructura jerárquica (8-12 nodos, flujo top-down)

## Archivos modificados
- `prisma/schema.prisma` — modelo Material
- `src/app/api/materials/route.ts` — CRUD API (nuevo)
- `src/app/api/materials/[id]/route.ts` — GET material por id (nuevo)
- `src/app/tools/materials/page.tsx` — página de gestión (nuevo)
- `src/app/api/ai/video/route.ts` — fix TTS per-slide
- `src/app/api/ai/game/route.ts` — GAME_REGISTRY, 5 tipos
- `src/app/tools/games/page.tsx` — 3 nuevos juegos interactivos + resultados
- `src/lib/prompts.ts` — prompts y schemas para matching, ordering, fill_blank + mejora mapa
- `src/components/MaterialInput.tsx` — 3 pestañas con "Mis apuntes"
- `src/components/ConceptMapEditor.tsx` — layout mejorado
- `src/app/dashboard/page.tsx` — card "Mis apuntes"

## Verificación
- `npx tsc --noEmit` — sin errores
- `npx prisma db push` — schema sincronizado
- Verificado en browser: juegos con 5 tipos, materiales CRUD, dashboard actualizado
