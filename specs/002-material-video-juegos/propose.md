# Spec 002 — Propose

## Fecha: 2026-09-19

## Objetivo

Resolver 3 problemas + 1 mejora:
1. Persistir material subido para reutilizarlo en todas las herramientas
2. Corregir bug de video donde el audio solo cubre la primera diapositiva
3. Agregar juegos interactivos creativos (no solo cuestionarios)
4. Mejorar visualizacion de mapas conceptuales

---

## Bloque A: Persistencia de material ("Mis apuntes")

### A1. Nuevo modelo Prisma `Material`

```prisma
model Material {
  id         String   @id @default(cuid())
  userId     String
  title      String
  fileName   String?
  content    String   // texto completo extraido (hasta 100k chars)
  charCount  Int
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@map("materials")
}
```

Agregar `materials Material[]` al modelo `User`.

### A2. API CRUD `/api/materials`

- **GET**: listar materiales del usuario (id, title, fileName, charCount, createdAt)
- **POST**: crear material (title, content, fileName opcional). Validacion: min 80 chars, max 100k, max 30 por usuario
- **DELETE**: eliminar por id con verificacion de ownership

### A3. Actualizar `MaterialInput.tsx`

Agregar tercer tab "Mis apuntes" junto a "Pegar texto" y "Subir archivo":
- Fetch materiales guardados del usuario
- Lista seleccionable con titulo, nombre de archivo y fecha
- Al seleccionar, carga el contenido en el estado de texto
- Boton "Guardar apunte" despues de subir archivo o pegar texto (opt-in)

### A4. Pagina `/tools/materials`

- Lista de apuntes guardados con titulo, archivo, chars, fecha
- Boton eliminar
- Enlace desde dashboard

### A5. Modificar `/api/ai/extract`

- Agregar opcion de guardar automaticamente el texto extraido como Material
- Devolver `materialId` en la respuesta

---

## Bloque B: Fix de video/audio

### B1. Generar TTS por slide individual

En `src/app/api/ai/video/route.ts`:
- En vez de concatenar todo en `fullScript`, iterar cada slide y generar TTS individual
- Concatenar los buffers de audio MP3
- Usar la duracion real de cada audio para calcular startTime/endTime de cada slide

```typescript
// Pseudocodigo del cambio
const audioBuffers: Buffer[] = [];
let cumulativeTime = 0;

for (const slide of slides) {
  const tts = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: slide.narration,
    response_format: "mp3",
  });
  const buffer = Buffer.from(await tts.arrayBuffer());
  audioBuffers.push(buffer);
  
  // Estimar duracion del chunk por tamaño del buffer
  // MP3 a 128kbps: duracion ~= bytes / 16000
  const estimatedDuration = buffer.length / 16000;
  slide.startTime = cumulativeTime;
  cumulativeTime += estimatedDuration;
  slide.endTime = cumulativeTime;
}

const finalAudio = Buffer.concat(audioBuffers);
```

### B2. Mejorar sincronizacion en el player

En `src/app/tools/videos/page.tsx`:
- Los tiempos ahora seran reales (del audio generado), no estimados
- Verificar que `findIndex` con startTime/endTime funcione correctamente

---

## Bloque C: Juegos creativos

Agregar 3 nuevos tipos de juego interactivos:

### C1. Matching (Relacionar pares)

- **Mecanica**: Se muestran 2 columnas. El jugador clickea un item de la izquierda y luego su par de la derecha. Los pares correctos se marcan verdes.
- **Prompt**: genera 8 pares (concepto-definicion, articulo-codigo, causa-efecto)
- **Schema**: `{ title, pairs: [{ left, right }] }`
- **Scoring**: puntos por par correcto, bonus por completar sin errores

### C2. Ordenar (Secuencia correcta)

- **Mecanica**: Se muestran items desordenados. El jugador los reordena clickeando flechas arriba/abajo o arrastrando.
- **Prompt**: genera 6-8 items que van en un orden especifico (pasos procesales, cronologia, jerarquia normativa)
- **Schema**: `{ title, description, items: [{ text, correct_position }] }`
- **Scoring**: puntos segun cuantos estan en la posicion correcta

### C3. Completar (Llenar espacios)

- **Mecanica**: Se muestra un texto legal con palabras faltantes (___). El jugador escribe la palabra correcta.
- **Prompt**: genera 6-8 oraciones con blancos estrategicos (terminos clave, plazos, articulos)
- **Schema**: `{ title, sentences: [{ text_with_blank, answer, hint, explanation }] }`
- **Scoring**: puntos por respuesta correcta (acepta variaciones menores)

### C4. Cambios en API y frontend

**`src/lib/prompts.ts`:**
- Nuevas funciones: `matchingGamePrompt()`, `orderingGamePrompt()`, `fillBlankGamePrompt()`
- Nuevos schemas JSON para cada tipo

**`src/app/api/ai/game/route.ts`:**
- Expandir validacion de gameType a 5 tipos
- Mapa de tipo -> {prompt, schema} en vez de boolean isTrivia
- Cada tipo devuelve su estructura nativa (sin normalizar a options/correct_index)

**`src/app/tools/games/page.tsx`:**
- Componentes separados: `MatchingGame`, `OrderingGame`, `FillBlankGame`
- Setup screen con 5 opciones de juego (2 columnas + 1)
- El componente de juego se renderiza segun `game.gameType`
- Scoring generalizado por tipo

---

## Bloque D: Mejora de mapas conceptuales

### D1. Mejorar layout en `ConceptMapEditor.tsx`

- Aumentar spacing: `nodesep: 120`, `ranksep: 160`
- Edges tipo `smoothstep` en vez de `default`
- Nodos con ancho dinamico segun longitud del texto

### D2. Mejorar prompt en `prompts.ts`

- Pedir que designe un nodo raiz/central
- Pedir estructura jerarquica clara (concepto principal -> sub-conceptos -> detalles)
- Reducir max nodos a 12 y limitar cross-links

---

## Orden de implementacion

1. **Bloque B** (fix video) — es un bug, prioridad alta, cambio acotado
2. **Bloque D** (mapas) — mejora rapida, pocos archivos
3. **Bloque A** (material) — feature mediana, modelo nuevo + UI
4. **Bloque C** (juegos) — feature grande, mas archivos y componentes nuevos

## Archivos a modificar/crear

| Archivo | Bloques |
|---------|---------|
| `prisma/schema.prisma` | A |
| `src/app/api/ai/video/route.ts` | B |
| `src/app/tools/videos/page.tsx` | B |
| `src/components/ConceptMapEditor.tsx` | D |
| `src/lib/prompts.ts` | C, D |
| `src/components/MaterialInput.tsx` | A |
| `src/app/api/materials/route.ts` | A (nuevo) |
| `src/app/tools/materials/page.tsx` | A (nuevo) |
| `src/app/api/ai/game/route.ts` | C |
| `src/app/tools/games/page.tsx` | C |
| `src/app/dashboard/page.tsx` | A |

## Riesgos

- **TTS por slide**: mas llamadas a la API = mas costo y tiempo. Mitigacion: son llamadas pequenas y rapidas
- **Concatenar MP3**: la concatenacion simple de buffers MP3 puede generar glitches en las uniones. Mitigacion: agregar silencio entre slides
- **Juegos nuevos**: el frontend crece bastante. Mitigacion: componentes separados por tipo
- **Matching drag-and-drop**: puede ser complejo en mobile. Mitigacion: usar click-to-select en vez de drag
