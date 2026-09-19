# Spec 004 — Nuevas herramientas de estudio

## Explore

### Herramientas a agregar
1. **Simulacro de examen oral** — IA hace preguntas como profesor, el alumno responde, recibe feedback
2. **Casos prácticos** — IA genera un caso jurídico, el alumno analiza, la IA corrige
3. **Chat con el apunte** — Chat conversacional sobre el material del alumno
4. **Comparador de conceptos** — Tabla lado a lado con diferencias/semejanzas de conceptos jurídicos

### Patrón existente para agregar herramienta
1. Prompt + schema en `src/lib/prompts.ts`
2. API route en `src/app/api/ai/xyz/route.ts`
3. Modelo Prisma si se necesita persistir datos
4. Página en `src/app/tools/xyz/page.tsx`
5. Entrada en el dashboard `src/app/dashboard/page.tsx`

### Decisiones de diseño

**Simulacro oral**: No es una generación one-shot como los otros tools. Es una conversación multi-turno: IA pregunta → alumno responde → IA evalúa → siguiente pregunta. Necesita estado de sesión. Se puede implementar con un array de mensajes del lado del cliente y llamadas sucesivas a la API. No necesita modelo Prisma nuevo (puede usar GeneratedContent para guardar el resultado final).

**Casos prácticos**: One-shot con interacción. La IA genera el caso, el alumno escribe su análisis, la IA corrige. Son 2 llamadas a la API: una para generar el caso, otra para corregir. Se puede reusar GeneratedContent.

**Chat con el apunte**: Multi-turno. El alumno sube texto y hace preguntas libres. Se implementa con historial de mensajes en el cliente y streaming de respuesta. Ruta API que recibe messages[] + texto del apunte. No necesita schema estricto (respuesta en texto libre). No necesita modelo nuevo.

**Comparador de conceptos**: One-shot. El alumno pega texto y la IA genera una tabla comparativa. Schema estructurado con conceptos, diferencias, semejanzas, artículos. Puede usar GeneratedContent.
