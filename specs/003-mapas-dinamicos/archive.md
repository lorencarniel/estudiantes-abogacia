# Spec 003 — Archive

## Estado: COMPLETADA

## Resumen

Se transformó el mapa conceptual de estático (8-12 nodos fijos) a dinámico expandible:
- El mapa arranca con 3-5 nodos principales
- Cada nodo tiene un botón "+" si es expandible
- Al clickear "+", la IA genera 2-4 sub-nodos conectados al padre
- El layout se recalcula automáticamente con dagre
- Los sub-nodos también pueden ser expandibles (profundidad ilimitada)

## Archivos modificados
- `src/lib/prompts.ts` — prompt inicial reducido + `expandNodePrompt` + `expandNodeSchema`
- `src/components/ConceptNode.tsx` — botón "+", estados expandable/expanding/expanded
- `src/components/ConceptMapEditor.tsx` — lógica de expansión, re-layout con dagre, ref para callback
- `src/app/api/ai/concept-map/expand/route.ts` — nueva API de expansión (creado)
- `src/app/tools/maps/page.tsx` — pasa sourceText al editor

## Verificación
- `npx tsc --noEmit` — sin errores
- Verificado en browser: mapa inicial con 5 nodos, expansión genera sub-nodos, segunda expansión funciona, layout se recalcula
