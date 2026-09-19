# Spec 005 - Cronograma interactivo — Archive

## Estado: COMPLETADO

## Resumen
El cronograma ahora es accionable: cada bloque de estudio tiene un botón "Estudiar" que navega a la herramienta correspondiente con el apunte pre-cargado.

### Mapeo actividad → herramienta
- Leer → Resúmenes
- Resumir → Esquemas
- Practicar → Cuestionarios
- Repasar → Flashcards

### Hook `useAutoLoadMaterial`
- Lee `?subject=` de la URL
- Busca en los apuntes guardados uno cuyo título coincida
- Si lo encuentra, carga el contenido y lo pasa a la herramienta
- La herramienta auto-genera el resultado sin intervención del usuario

## Archivos
- `src/hooks/useAutoLoadMaterial.ts` — nuevo hook reutilizable
- `src/app/tools/schedules/page.tsx` — botón "Estudiar" en cada bloque
- `src/app/tools/summaries/page.tsx` — auto-load desde cronograma
- `src/app/tools/outlines/page.tsx` — auto-load desde cronograma
- `src/app/tools/quizzes/page.tsx` — auto-load desde cronograma
- `src/app/tools/flashcards/page.tsx` — auto-load desde cronograma

## Commit
- `9769679` — feat: Spec 005 - Cronograma interactivo con botón Estudiar
