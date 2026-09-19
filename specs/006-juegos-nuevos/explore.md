# Spec 006 - 7 juegos nuevos — Explore

## Juegos actuales
- Trivia (multiple choice)
- Verdadero/Falso
- Matching (unir pares)
- Ordering (ordenar)
- Fill the blank (completar)

Todos usan GAME_REGISTRY en `/api/ai/game/route.ts` y se despachan via InteractiveGame en `games/page.tsx`.

## Juegos nuevos a agregar

### 1. Ahorcado (hangman)
- La IA elige un término jurídico clave del material
- Da una pista/definición
- El estudiante adivina letra por letra
- Máximo 6 errores (dibujo del ahorcado)

### 2. Crucigrama (crossword)
- Grilla de 8-12 palabras cruzadas
- Las pistas son definiciones del material
- Se completa palabra por palabra

### 3. Memotest (memory)
- Grilla de cartas boca abajo (6-8 pares)
- Cada par: concepto + definición
- Se dan vuelta de a 2, si coinciden quedan visibles

### 4. Categorización (categorize)
- 2-4 categorías (ej: "Derechos reales" vs "Derechos personales")
- 8-16 conceptos para clasificar
- Drag & drop o click para asignar

### 5. Completa el artículo (article_fill)
- Un artículo del código con 3-5 palabras clave removidas
- El estudiante elige la palabra correcta de opciones

### 6. Quién quiere ser abogado (millionaire)
- 10 preguntas de dificultad creciente
- 3 comodines: 50/50, pista extra, cambiar pregunta
- Si falla, pierde (como el programa de TV)

### 7. Línea de tiempo (timeline)
- 5-8 eventos/leyes/fechas del material
- Ordenarlos cronológicamente
- Similar a ordering pero con contexto temporal

## Arquitectura
Cada juego se agrega al GAME_REGISTRY existente con su prompt, schema y componente UI.
