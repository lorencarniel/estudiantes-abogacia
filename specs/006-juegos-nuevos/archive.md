# Spec 006 - 7 juegos nuevos — Archive

## Resultado: COMPLETADA

## Resumen
Se agregaron 7 nuevos tipos de juego interactivos a la plataforma, llevando el total de 5 a 12.

## Juegos agregados
1. **Ahorcado** — Adiviná términos jurídicos letra por letra (6 intentos max)
2. **Memotest** — Encontrá pares concepto-definición en una grilla de cartas
3. **Categorizar** — Clasificá conceptos en las categorías correctas
4. **Completa el artículo** — Completá artículos del código con las palabras faltantes
5. **Quién quiere ser abogado** — 10 preguntas de dificultad creciente con comodines
6. **Línea de tiempo** — Ordená eventos cronológicamente
7. **Crucigrama** — Completá una grilla de palabras cruzadas con pistas jurídicas

## Archivos modificados
- `src/lib/prompts.ts` — 7 prompts + schemas nuevos
- `src/app/api/ai/game/route.ts` — GAME_REGISTRY con 12 tipos, procesamiento de respuestas
- `src/app/tools/games/page.tsx` — 7 componentes UI + selector actualizado
- `specs/006-juegos-nuevos/` — explore.md, propose.md

## Commit
`5b774d8` — "Spec 006: agregar 7 juegos nuevos"
