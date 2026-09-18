# 001 - Tipo de examen + Cronograma de materia

## Explore

### Objetivo
Agregar dos funcionalidades:
1. **Selector de tipo de examen** (parcial/final/libre) en cuestionarios y juegos
2. **Subir programa/cronograma de la materia** para que la IA siga el programa oficial

### Hallazgos

#### Feature 1: Tipo de examen

**Archivos involucrados:**
- `src/app/tools/quizzes/page.tsx` — ya tiene selector de dificultad (facil/media/dificil), hay que agregar selector de tipo de examen
- `src/app/tools/games/page.tsx` — tiene selector de gameType (trivia/true_false), hay que agregar examType
- `src/app/api/ai/quiz/route.ts` — recibe `{text, difficulty}`, hay que agregar `examType`
- `src/app/api/ai/game/route.ts` — recibe `{text, gameType}`, hay que agregar `examType`
- `src/lib/prompts.ts` — `quizPrompt()` y `triviaGamePrompt()`/`trueFalseGamePrompt()` deben recibir examType y ajustar instrucciones
- `prisma/schema.prisma` — QuizAttempt y GameSession podrian guardar el examType (opcional)

**Logica por tipo de examen:**
- **Parcial**: temas acotados, preguntas mas directas, puede haber multiple choice y desarrollo corto
- **Final**: integra multiples temas, preguntas que cruzan conceptos, mayor exigencia
- **Libre**: nivel maximo, preguntas que exigen dominio total, se evalua como si no hubiera cursado

#### Feature 2: Cronograma/Programa de la materia

**Concepto:** El usuario sube un PDF/texto con el programa oficial de la materia (unidades, temas, bibliografia). La IA lo usa como contexto adicional para:
- Organizar el contenido segun las unidades del programa
- Indicar en resúmenes/esquemas a qué unidad pertenece cada tema
- Generar preguntas que cubran el programa equilibradamente

**Implementacion posible:**
- Nuevo modelo `Syllabus` en Prisma: userId, title, content (texto extraido), fileName, createdAt
- Pagina para gestionar programas: subir, ver, eliminar
- API `/api/syllabus` para CRUD
- Componente `SyllabusSelector` para elegir un programa guardado al generar contenido
- Los prompts reciben el programa como contexto adicional en un tag `<programa>`

**Archivos a crear:**
- `prisma/schema.prisma` — nuevo modelo Syllabus
- `src/app/api/syllabus/route.ts` — GET (listar), POST (crear), DELETE
- `src/app/tools/syllabus/page.tsx` — pagina de gestion de programas
- `src/components/SyllabusSelector.tsx` — selector reutilizable

**Archivos a modificar:**
- `src/lib/prompts.ts` — todas las funciones de prompt reciben `syllabus?: string` opcional
- `src/components/MaterialInput.tsx` — agregar selector de programa
- Todas las rutas API de AI — pasar syllabus al prompt si esta disponible
- `src/app/dashboard/page.tsx` — agregar herramienta "Programas" al grid
- `src/components/Navbar.tsx` o dashboard — enlace a programas
