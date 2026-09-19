# Spec 006 - 7 juegos nuevos — Propose

## Cambios

### 1. `src/lib/prompts.ts` — 7 nuevos prompts y schemas
Cada juego necesita un prompt que le diga a la IA qué generar y un schema JSON strict.

### 2. `src/app/api/ai/game/route.ts` — Agregar al GAME_REGISTRY
Cada juego se registra con su prompt, schema y config.

### 3. `src/app/tools/games/page.tsx` — 7 nuevos componentes UI
Cada juego tiene su propio componente interactivo:
- HangmanGameUI
- CrosswordGameUI
- MemoryGameUI
- CategorizeGameUI
- ArticleFillGameUI
- MillionaireGameUI
- TimelineGameUI

### 4. Selector de juego actualizado
El selector de tipo de juego mostrará los 12 tipos disponibles organizados por categoría.

## Orden de implementación
1. Prompts + schemas (todos juntos en prompts.ts)
2. GAME_REGISTRY (actualizar route.ts)
3. Componentes UI (uno por uno)
4. Type check + verificar
