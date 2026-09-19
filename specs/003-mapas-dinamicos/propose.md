# Spec 003 — Propose

## Objetivo
Transformar el mapa conceptual estático en uno dinámico expandible: arranca con pocos nodos y el usuario expande ramas clickeando "+", generando sub-nodos con IA bajo demanda.

---

## Bloque A — Prompt inicial reducido

**Archivo**: `src/lib/prompts.ts`

Modificar `conceptMapPrompt` para generar solo 3-5 nodos de alto nivel:
- Nodo principal (n1) + 2-4 nodos secundarios
- Cada nodo lleva un campo nuevo `expandable: true/false` indicando si tiene potencial para profundizar
- Prompt nuevo indica: "Generá un mapa inicial con los 3-5 conceptos más importantes. Marcá como expandable los nodos que podrían tener sub-conceptos"

Nuevo prompt `expandNodePrompt(text, parentLabel, parentCategory, existingLabels)`:
- Recibe el texto fuente, el nodo padre que se quiere expandir, y los labels ya existentes (para no repetir)
- Genera 2-4 sub-nodos hijos con edges al nodo padre
- Schema nuevo `expandNodeSchema` que devuelve `{ nodes[], edges[] }`

Actualizar `conceptMapSchema` para agregar `expandable: boolean` a los nodos.

---

## Bloque B — ConceptNode expandible

**Archivo**: `src/components/ConceptNode.tsx`

Agregar al nodo:
- Botón "+" visible cuando `data.expandable && !data.expanded` — aparece abajo del nodo
- Indicador visual de "expandido" (el botón "+" desaparece, queda un ícono de check o rama)
- Indicador de "cargando" mientras se expande (spinner en lugar del "+")
- Callback `onExpand(nodeId)` que se pasa desde el editor

---

## Bloque C — ConceptMapEditor con expansión

**Archivo**: `src/components/ConceptMapEditor.tsx`

Cambios:
1. Recibir `sourceText` como prop adicional (el texto original del apunte)
2. Nueva función `handleExpandNode(nodeId)`:
   - Busca el nodo por id, obtiene su label y category
   - Recopila labels existentes para evitar duplicados
   - POST a `/api/ai/concept-map/expand` con `{ text: sourceText, parentId, parentLabel, parentCategory, existingLabels }`
   - Recibe nuevos nodos y edges
   - Los agrega al estado de ReactFlow
   - Marca el nodo padre como `expanded: true`, `expandable: false`
   - Re-ejecuta dagre layout con TODOS los nodos + edges
   - Anima la transición (ReactFlow soporta animación de posición)
3. Estado de loading por nodo (`expandingNodeId`)
4. Pasar `onExpand` y `isExpanding` al ConceptNode via `data`

---

## Bloque D — API de expansión

**Archivo nuevo**: `src/app/api/ai/concept-map/expand/route.ts`

- Autenticación y validación igual que la ruta original
- Recibe: `{ text, parentId, parentLabel, parentCategory, existingLabels[] }`
- Llama a OpenAI con `expandNodePrompt`
- Genera IDs únicos para los nuevos nodos (basados en parentId: `n1-1`, `n1-2`, etc.)
- Devuelve `{ nodes[], edges[] }` con los sub-nodos generados

---

## Bloque E — Página de mapas actualizada

**Archivo**: `src/app/tools/maps/page.tsx`

- Guardar el texto fuente en estado para pasarlo al editor
- Pasar `sourceText` como prop al `ConceptMapEditor`
- Actualizar la descripción de la herramienta para reflejar la funcionalidad expandible

---

## Riesgos
- **Rendimiento**: dagre re-layout en mapas grandes (>30 nodos) podría ser lento → mitigar con layout incremental
- **Costo API**: cada expansión es una llamada a OpenAI → aceptable, son llamadas chicas
- **Colisión de IDs**: usar prefijos basados en el padre (`n1-1`, `n1-2`) para evitar colisiones

## Archivos a modificar
- `src/lib/prompts.ts` — prompt inicial + expandNodePrompt + schemas
- `src/components/ConceptNode.tsx` — botón "+", estados expandible/expandido
- `src/components/ConceptMapEditor.tsx` — expansión, re-layout, props
- `src/app/api/ai/concept-map/expand/route.ts` — nueva ruta (crear)
- `src/app/tools/maps/page.tsx` — pasar sourceText
