# Spec 004 — Propose

## 4 herramientas nuevas

---

## Herramienta 1: Simulacro de examen oral

### Flujo
1. Alumno sube/pega texto + selecciona tipo de examen
2. La IA genera 5 preguntas de examen oral (no se muestran al alumno)
3. Se muestra la primera pregunta
4. Alumno escribe su respuesta en un textarea
5. La IA evalúa la respuesta: puntaje (1-10), qué estuvo bien, qué faltó, respuesta modelo
6. Se pasa a la siguiente pregunta
7. Al final: resumen con puntaje total, puntos fuertes y débiles

### Archivos
- `src/lib/prompts.ts`: `oralExamPrompt` + `oralExamSchema` (genera preguntas), `evaluateAnswerPrompt` + `evaluateAnswerSchema` (evalúa respuesta)
- `src/app/api/ai/oral-exam/route.ts`: genera las preguntas
- `src/app/api/ai/oral-exam/evaluate/route.ts`: evalúa una respuesta
- `src/app/tools/oral-exam/page.tsx`: UI conversacional pregunta-respuesta
- Dashboard: agregar card

---

## Herramienta 2: Casos prácticos

### Flujo
1. Alumno sube/pega texto + tipo de examen
2. La IA genera un caso práctico jurídico basado en el material
3. Se muestra el caso con preguntas guía
4. Alumno escribe su análisis
5. La IA corrige: identifica aciertos, errores, conceptos omitidos, puntaje

### Archivos
- `src/lib/prompts.ts`: `practicalCasePrompt` + `practicalCaseSchema`, `evaluateCasePrompt` + `evaluateCaseSchema`
- `src/app/api/ai/practical-case/route.ts`: genera el caso
- `src/app/api/ai/practical-case/evaluate/route.ts`: evalúa el análisis
- `src/app/tools/practical-cases/page.tsx`: UI con caso + editor + corrección
- Dashboard: agregar card

---

## Herramienta 3: Chat con el apunte

### Flujo
1. Alumno sube/pega texto
2. Se abre un chat. El alumno puede hacer preguntas libres
3. La IA responde basándose exclusivamente en el material
4. Historial de mensajes se mantiene en el cliente
5. Se usa streaming para mostrar la respuesta progresivamente

### Archivos
- `src/app/api/ai/chat/route.ts`: recibe `{ text, messages[] }`, devuelve stream
- `src/app/tools/chat/page.tsx`: UI de chat con input + historial de mensajes
- Dashboard: agregar card
- No necesita prompts.ts (el prompt se arma en la ruta API directamente)

---

## Herramienta 4: Comparador de conceptos

### Flujo
1. Alumno sube/pega texto
2. La IA identifica conceptos que se pueden comparar y genera una tabla
3. Cada comparación tiene: concepto A, concepto B, diferencias, semejanzas, artículos

### Archivos
- `src/lib/prompts.ts`: `compareConceptsPrompt` + `compareConceptsSchema`
- `src/app/api/ai/compare/route.ts`: genera comparaciones
- `src/app/tools/compare/page.tsx`: UI con tabla de comparaciones
- Dashboard: agregar card

---

## Orden de implementación
1. Comparador (más simple, one-shot)
2. Chat (más versátil, requiere streaming)
3. Casos prácticos (2 llamadas API)
4. Simulacro oral (más complejo, multi-turno)

## Archivos a modificar en todos
- `src/app/dashboard/page.tsx`: 4 nuevas cards
