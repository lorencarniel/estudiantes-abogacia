# Spec 002 — Explore

## Fecha: 2026-09-19

## Problemas reportados

### 1. Material no se guarda (hay que re-subir siempre)

**Estado actual:**
- `MaterialInput.tsx` extrae texto via `/api/ai/extract` y lo guarda en estado React local
- El texto extraido se pasa directo al API de cada herramienta y se descarta
- Solo se guarda un excerpt de 500 chars en `sourceText` de los contenidos generados
- No existe ningun modelo en la DB para guardar material/apuntes del usuario
- El modelo `Syllabus` es lo mas cercano pero sirve para otro proposito

**Impacto:** El usuario debe re-subir el PDF cada vez que quiere usar una herramienta diferente.

**Solucion necesaria:** Nuevo modelo `Material` para persistir texto extraido, con CRUD API y selector en MaterialInput.

---

### 2. Bug de video: audio solo cubre la primera diapositiva

**Causa raiz:** La API TTS de OpenAI (`tts-1`) tiene un limite de **4096 caracteres** en el input. El `fullScript` concatena las narraciones de 7 slides (cada una de 50-100 palabras ~450 chars), resultando en ~3500-5600 chars que excede el limite. OpenAI trunca silenciosamente.

**Archivo:** `src/app/api/ai/video/route.ts` lineas 87-98
```js
const fullScript = slides.map(s => s.narration).join(" ... ");
// fullScript puede ser >4096 chars -> TTS trunca
const ttsResponse = await openai.audio.speech.create({
  model: "tts-1",
  input: fullScript, // AQUI SE TRUNCA
});
```

**Problema secundario:** Los tiempos de slides se estiman con 2.5 palabras/segundo en vez de usar la duracion real del audio, causando desincronizacion.

**Solucion necesaria:** Generar TTS por slide individual, concatenar los MP3, y usar duraciones reales.

---

### 3. Juegos poco creativos (son solo cuestionarios)

**Estado actual:**
- Solo 2 tipos: Trivia (10 preguntas, 4 opciones) y V/F (12 afirmaciones, 2 opciones)
- Ambos usan el mismo flujo: mostrar pregunta -> botones de opcion -> timer -> feedback
- El frontend es un componente monolitico de ~676 lineas hardcodeado para "elegir respuesta"
- El schema `GameSession` es flexible (gameType String, questions JSON)

**Arquitectura para agregar tipos:**
- `prompts.ts`: nueva funcion de prompt + schema JSON por tipo
- `api/ai/game/route.ts`: expandir validacion, agregar selector de prompt/schema
- `games/page.tsx`: componentes separados por tipo de juego

**Tipos de juego propuestos:**
1. **Matching (Relacionar)** — arrastrar conceptos a sus definiciones
2. **Ordenar** — poner pasos procesales/eventos en orden correcto
3. **Completar** — texto legal con espacios en blanco para rellenar
4. **Clasificar** — categorizar items (ej: nulidad absoluta vs relativa)
5. **Caso practico** — escenario legal con analisis paso a paso
6. **Ahorcado juridico** — adivinar termino legal letra por letra

---

### 4. Mapas conceptuales desordenados

**Causa:** `ConceptMapEditor.tsx` usa dagre con layout top-to-bottom, spacing ajustado (nodesep:60, ranksep:100) y nodos de tamaño fijo (170x50). No agrupa por categoria. Edges se cruzan.

**Mejoras posibles:**
- Aumentar spacing (nodesep:120, ranksep:160)
- Nodos de tamaño dinamico segun contenido
- Edges tipo smoothstep/bezier en vez de default
- Nodo central/raiz para el concepto principal
- Mejor instrucciones en el prompt para estructura jerarquica
