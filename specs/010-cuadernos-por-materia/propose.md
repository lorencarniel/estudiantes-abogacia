# Spec 010 — Cuadernos por materia

## Objetivo
Permitir al usuario crear cuadernos organizados por materia (ej: "Penal", "Civil") donde pueda agrupar todos sus apuntes. En el chat con apunte, poder seleccionar un cuaderno completo como contexto.

## Modelo de datos

### Nuevo: Notebook
- id, userId, name (nombre de la materia), color, createdAt, updatedAt
- Relación 1:N con Material

### Modificar: Material
- Agregar campo opcional `notebookId` (FK a Notebook)
- OnDelete: SetNull (si se borra el cuaderno, los materiales quedan sueltos)

## Archivos nuevos

1. `src/app/api/notebooks/route.ts` — GET (listar), POST (crear)
2. `src/app/api/notebooks/[id]/route.ts` — GET (detalle con materiales), PUT (renombrar), DELETE
3. `src/app/tools/notebooks/page.tsx` — Página de gestión de cuadernos

## Archivos a modificar

1. `prisma/schema.prisma` — Agregar Notebook, notebookId en Material
2. `src/app/api/materials/route.ts` — Aceptar notebookId en POST
3. `src/app/tools/chat/page.tsx` — Agregar selector de cuaderno antes del chat
4. `src/app/api/ai/chat/route.ts` — Aceptar notebookId, cargar materiales concatenados
5. `src/app/dashboard/page.tsx` — Agregar tool card de cuadernos
6. `src/components/MaterialInput.tsx` — Agregar tab "Mis cuadernos" para seleccionar notebook completo

## Flujo del usuario
1. Crear cuaderno "Derecho Penal"
2. Subir/asignar apuntes al cuaderno
3. En chat → seleccionar cuaderno → la IA tiene todo el material de esa materia como contexto
