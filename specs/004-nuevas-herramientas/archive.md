# Spec 004 - Nuevas herramientas de estudio — Archive

## Estado: COMPLETADO

## Resumen

Se implementaron 4 nuevas herramientas de estudio con IA:

### 1. Comparador de conceptos (`/tools/compare`)
- Identifica conceptos que se prestan a confusión en el material
- Genera tabla comparativa con definiciones, diferencias, semejanzas, normativa y ejemplo
- API: `/api/ai/compare`

### 2. Chat con el apunte (`/tools/chat`)
- Chat libre con el material cargado
- La IA responde basándose exclusivamente en el apunte
- Mantiene historial de conversación (últimos 10 mensajes)
- API: `/api/ai/chat`

### 3. Casos prácticos (`/tools/practical-cases`)
- Genera un caso jurídico con hechos, preguntas y resolución modelo
- El estudiante escribe su análisis y recibe corrección automática
- Evaluación con puntaje, aciertos, errores, omisiones y feedback
- APIs: `/api/ai/practical-case`, `/api/ai/practical-case/evaluate`

### 4. Simulacro de examen oral (`/tools/oral-exam`)
- 5 preguntas de examen oral con dificultad variable
- Flujo pregunta → respuesta → evaluación → siguiente
- Resumen final con promedio y detalle expandible por pregunta
- APIs: `/api/ai/oral-exam`, `/api/ai/oral-exam/evaluate`

## Archivos creados/modificados

### Nuevos
- `src/app/api/ai/compare/route.ts`
- `src/app/api/ai/chat/route.ts`
- `src/app/api/ai/practical-case/route.ts`
- `src/app/api/ai/practical-case/evaluate/route.ts`
- `src/app/api/ai/oral-exam/route.ts`
- `src/app/api/ai/oral-exam/evaluate/route.ts`
- `src/app/tools/compare/page.tsx`
- `src/app/tools/chat/page.tsx`
- `src/app/tools/practical-cases/page.tsx`
- `src/app/tools/oral-exam/page.tsx`

### Modificados
- `src/lib/prompts.ts` — prompts y schemas para las 4 herramientas
- `src/app/dashboard/page.tsx` — 4 nuevas cards + iconos/labels en historial

## Commit
- `6dd35f9` — feat: Spec 004 - Agregar 4 nuevas herramientas de estudio
