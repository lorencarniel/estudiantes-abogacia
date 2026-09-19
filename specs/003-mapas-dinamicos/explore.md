# Spec 003 — Mapas conceptuales dinámicos expandibles

## Explore

### Problema actual
El mapa conceptual se genera con 8-12 nodos fijos. No hay forma de profundizar en un concepto específico. Si el material es extenso, el mapa queda superficial. El usuario no puede explorar ramas ni ampliar niveles.

### Implementación actual
- **ConceptMapEditor.tsx**: ReactFlow + dagre layout, nodos estáticos después de generación
- **ConceptNode.tsx**: nodo simple con label, categoría y colores. Sin botones de acción.
- **API `/api/ai/concept-map`**: genera todo el mapa en una sola llamada, 8-12 nodos máx.
- **Prompt**: pide estructura jerárquica fija: principal → secundarios → definiciones/ejemplos/normas
- El texto fuente se guarda en `sourceText` (primeros 500 chars) pero no se usa después

### Propuesta de solución: Expansión progresiva por nodos

**Concepto**: El mapa arranca con 3-5 nodos de alto nivel. Cada nodo tiene un botón "+" para expandir. Al clickear "+", se llama a la IA con el texto original + el contexto del nodo seleccionado, y la IA genera 2-4 sub-nodos hijos. El mapa se re-layoutea automáticamente con dagre.

**Flujo**:
1. Generación inicial: prompt pide solo 3-5 nodos principales (nivel 1)
2. Usuario clickea "+" en un nodo → POST a nueva ruta `/api/ai/concept-map/expand`
3. La API recibe: texto original, nodo padre (label + category), nodos existentes
4. La IA genera 2-4 sub-nodos nuevos con edges al padre
5. Los nuevos nodos se insertan en el grafo, dagre re-calcula posiciones
6. El nodo expandido pierde el botón "+" y gana un indicador de "expandido"

**Beneficios**:
- El usuario explora solo lo que le interesa
- No se satura el mapa con nodos innecesarios
- Se puede ir tan profundo como se quiera
- Más interactivo y pedagógicamente útil

### Cambios necesarios
1. **ConceptNode.tsx**: agregar botón "+" y estado expandible/colapsable
2. **ConceptMapEditor.tsx**: función de expansión, re-layout, guardar texto fuente
3. **Nueva ruta API**: `/api/ai/concept-map/expand` para generar sub-nodos
4. **Nuevo prompt**: `expandNodePrompt` que recibe contexto del nodo padre
5. **maps/page.tsx**: pasar texto fuente al editor para expansiones
6. **Prompt inicial**: reducir a 3-5 nodos para dejar espacio a expansión
