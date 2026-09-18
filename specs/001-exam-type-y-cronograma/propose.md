# 001 - Tipo de examen + Cronograma de materia

## Propose

### Feature 1: Selector de tipo de examen

**Cambios en prompts (`src/lib/prompts.ts`):**
- `quizPrompt()` recibe nuevo param `examType: "parcial" | "final" | "libre"`
- `triviaGamePrompt()` y `trueFalseGamePrompt()` reciben `examType`
- Instrucciones por tipo:
  - **parcial**: "Generá preguntas enfocadas en los temas del material como un examen parcial universitario. Priorizá conceptos individuales y definiciones precisas."
  - **final**: "Generá preguntas como un examen final universitario. Incluí preguntas que integren y crucen distintos conceptos del material, exigiendo una comprensión global."
  - **libre**: "Generá preguntas como un examen libre universitario (alumno que no cursó). Nivel máximo de exigencia: preguntas de análisis profundo, casos complejos y relaciones entre institutos jurídicos."

**Cambios en API:**
- `src/app/api/ai/quiz/route.ts` — agregar `examType` al schema Zod y pasarlo a `quizPrompt()`
- `src/app/api/ai/game/route.ts` — agregar `examType` al body y pasarlo a los prompts
- `prisma/schema.prisma` — agregar campo `examType` (String, opcional) a QuizAttempt y GameSession

**Cambios en UI:**
- `src/app/tools/quizzes/page.tsx` — nuevo `<select>` para tipo de examen, enviarlo en el fetch
- `src/app/tools/games/page.tsx` — nuevo `<select>` para tipo de examen, enviarlo en el fetch

---

### Feature 2: Programa de la materia

**Nuevo modelo en Prisma:**
```
model Syllabus {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String
  fileName  String?
  createdAt DateTime @default(now())
  user      User     @relation(...)
}
```

**Nuevos archivos:**
- `src/app/api/syllabus/route.ts` — GET lista programas del usuario, POST crea uno (recibe texto o usa /api/ai/extract), DELETE elimina
- `src/app/tools/syllabus/page.tsx` — pagina para subir/ver/eliminar programas

**Cambios en archivos existentes:**
- `prisma/schema.prisma` — modelo Syllabus + relacion en User
- `src/lib/prompts.ts` — todas las funciones reciben `syllabus?: string` y lo incluyen como `<programa>` en el prompt
- `src/components/MaterialInput.tsx` — agregar dropdown para seleccionar programa guardado (fetch a /api/syllabus)
- Rutas API de AI (quiz, summary, outline, concept-map, flashcards, audio, game, video) — leer `syllabusId` del body, buscar en DB, pasar contenido al prompt
- `src/app/dashboard/page.tsx` — agregar "Programas" al grid de herramientas

---

### Orden de implementacion

1. Schema Prisma (Syllabus + examType) + db push
2. API de syllabus (CRUD)
3. Pagina de gestion de programas
4. Actualizar prompts (examType + syllabus)
5. Actualizar APIs de AI para recibir examType y syllabusId
6. Actualizar MaterialInput con selector de programa
7. Actualizar UI de quizzes y games con selector de tipo de examen
8. Dashboard: agregar enlace a Programas
9. Verificar en browser
10. Commit + push

### Riesgos
- El texto del programa sumado al apunte puede exceder el contexto del modelo — mitigacion: limitar programa a 10.000 chars
- Agregar campo a tablas existentes con SQLite es seguro (campo nullable, sin default requerido)
