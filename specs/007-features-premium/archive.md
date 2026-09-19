# Spec 007 - Features premium — Archive

## Resultado: COMPLETADA

## Features implementadas

### 1. Dark mode
- Toggle sol/luna en navbar
- Persistencia en localStorage
- Clases dark: en componentes base (card, input, navbar, dashboard)
- `ThemeProvider` wrappea la app

### 2. Modo Pomodoro
- Timer circular con fases estudio (25min) y descanso (5min)
- Botón "Modo Pomodoro" en dashboard
- Contador de sesiones completadas

### 3. Generador de mnemotécnicos
- Nueva herramienta `/tools/mnemonics`
- Genera acrónimos, frases, asociaciones, historias
- Prompt + schema en prompts.ts
- API route `/api/ai/mnemonic`

### 4. Glosario jurídico automático
- Nueva herramienta `/tools/glossary`
- Extrae términos jurídicos con definiciones y categorías
- Búsqueda y filtro por categoría
- Se pueden agregar más términos iterativamente

### 5. Exportar a PDF
- Componente `ExportPDF` reutilizable
- Carga html2pdf.js via CDN dinámicamente
- Integrado en resúmenes

### 6. Sistema de gamificación (XP)
- Modelo `UserXP` en Prisma (totalXP, level, streak)
- 10 niveles con nombres jurídicos (Aspirante → Juez Supremo)
- `addXP()` integrado en rutas de summary, quiz, game, mnemonic, glossary
- `XPBar` componente en dashboard con barra de progreso y racha

## Archivos nuevos: 12
## Archivos modificados: 11
## Commit: `a0b6390`
