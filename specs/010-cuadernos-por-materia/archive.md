# Spec 010 — Cuadernos por materia

## Estado: COMPLETADA

## Fecha: 2026-09-21

## Resumen

Se implementó un sistema de cuadernos por materia que permite organizar apuntes y chatear con todo el contenido de una materia.

### Modelo de datos
- **Notebook**: id, userId, name, color, createdAt, updatedAt
- **Material**: se agregó campo `notebookId` (FK opcional a Notebook, OnDelete: SetNull)

### APIs
- `GET/POST /api/notebooks` — listar y crear cuadernos (máximo 20)
- `GET/PUT/DELETE /api/notebooks/[id]` — detalle con materiales, renombrar, eliminar
- `PATCH /api/materials` — asignar/desasignar material a cuaderno
- `POST /api/materials` — acepta `notebookId` opcional al crear
- `POST /api/ai/chat` — acepta `notebookId`, concatena todos los materiales del cuaderno como contexto

### Página de cuadernos (`/tools/notebooks`)
- Lista de cuadernos con color y cantidad de apuntes
- Crear cuaderno con nombre y color
- Ver detalle: materiales asignados, agregar existentes, subir nuevos
- Botón "Chatear con este cuaderno" que navega al chat con query param

### Chat con cuadernos (`/tools/chat`)
- Nuevo tab "Mis cuadernos" cuando hay cuadernos con materiales
- Selector visual de cuadernos con color y cantidad
- Soporte de query param `?notebook=id` para abrir directo
- La API concatena todos los materiales del cuaderno y los envía como contexto

### Dashboard
- Tool card de "Cuadernos" agregada

## Archivos creados
- `src/app/api/notebooks/route.ts`
- `src/app/api/notebooks/[id]/route.ts`
- `src/app/tools/notebooks/page.tsx`

## Archivos modificados
- `prisma/schema.prisma` (modelo Notebook, notebookId en Material)
- `src/app/api/materials/route.ts` (PATCH + notebookId en POST)
- `src/app/api/ai/chat/route.ts` (soporte notebookId)
- `src/app/tools/chat/page.tsx` (selector de cuadernos)
- `src/app/dashboard/page.tsx` (tool card)
