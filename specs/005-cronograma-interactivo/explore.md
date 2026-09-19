# Spec 005 - Cronograma interactivo con herramientas — Explore

## Problema
El cronograma actual solo dice qué hacer (ej: "Teoría del Delito - Leer") pero no permite actuar desde ahí. El usuario quiere que cada actividad lo lleve directo a estudiar con la herramienta apropiada, usando sus apuntes guardados.

## Estado actual
- El cronograma genera bloques con `subject`, `activity` y `minutes`
- Las actividades son: Leer, Resumir, Practicar, Repasar
- Los materiales se guardan en la tabla `Material` con `title`, `content`, `userId`
- Cada herramienta acepta texto via `MaterialInput` (pegar, subir PDF, o elegir apunte guardado)

## Solución
Cada bloque del cronograma tendrá un botón "Estudiar" que navega a la herramienta correspondiente pasando el nombre del tema como query param. La página destino pre-cargará el apunte guardado que coincida con ese tema.

### Mapeo actividad → herramienta
- **Leer** → `/tools/summaries` (genera resumen del tema)
- **Resumir** → `/tools/outlines` (genera esquema)
- **Practicar** → `/tools/quizzes` (cuestionario) o `/tools/games` (juegos)
- **Repasar** → `/tools/flashcards` (flashcards para repaso)

### Flujo
1. Click en "Estudiar" en un bloque del cronograma
2. Navega a la herramienta con `?subject=Teoría+del+Delito`
3. La herramienta busca automáticamente en los apuntes guardados uno que coincida
4. Si lo encuentra, lo pre-carga y arranca directo
5. Si no, muestra MaterialInput normal con sugerencia de buscar en "Mis apuntes"
