# Spec 007 - Features premium — Propose

## Orden de implementación

### 1. Dark mode
- `tailwind.config.ts`: agregar `darkMode: "class"`
- `src/components/ThemeProvider.tsx`: nuevo, lee/guarda en localStorage, aplica clase `dark` al html
- `src/app/layout.tsx`: wrappear con ThemeProvider
- `src/components/Navbar.tsx`: agregar toggle sol/luna
- `src/app/globals.css`: agregar variantes dark para .card, .btn-primary, .btn-secondary, .input-field, body

### 2. Modo Pomodoro
- `src/components/PomodoroTimer.tsx`: timer con estados (estudio/descanso/pausa), círculo de progreso, sonido al terminar
- `src/app/tools/schedules/page.tsx`: integrar timer al hacer click en "Estudiar"

### 3. Generador de mnemotécnicos
- `src/lib/prompts.ts`: mnemonicPrompt + mnemonicSchema
- `src/app/api/ai/mnemonic/route.ts`: nueva ruta
- `src/app/tools/mnemonics/page.tsx`: nueva página

### 4. Glosario automático
- `prisma/schema.prisma`: modelo GlossaryTerm (userId, term, definition, source, category)
- `src/lib/prompts.ts`: glossaryPrompt + glossarySchema
- `src/app/api/ai/glossary/route.ts`: extraer términos
- `src/app/api/glossary/route.ts`: CRUD + búsqueda
- `src/app/tools/glossary/page.tsx`: página con búsqueda y lista

### 5. Exportar a PDF
- Instalar `html2pdf.js` via CDN (script tag dinámico, sin npm)
- `src/components/ExportPDF.tsx`: botón reutilizable que captura un div y genera PDF
- Agregar botón en summaries, outlines, flashcards

### 6. Subrayador inteligente
- `src/lib/prompts.ts`: modificar summaryPrompt para devolver highlights opcionales
- `src/app/tools/summaries/page.tsx`: renderizar highlights con colores

### 7. Sistema de gamificación (XP)
- `prisma/schema.prisma`: modelo UserXP (userId, xp, level, lastActivityDate)
- `src/lib/xp.ts`: constantes de XP por acción, función addXP, cálculo de nivel
- `src/app/api/xp/route.ts`: GET estado actual
- Agregar llamadas addXP en las rutas API existentes (quiz, game, summary, etc.)
- `src/components/XPBar.tsx`: barra de XP + nivel en el dashboard
- `src/app/dashboard/page.tsx`: integrar XPBar

## Archivos nuevos
- `src/components/ThemeProvider.tsx`
- `src/components/PomodoroTimer.tsx`
- `src/components/ExportPDF.tsx`
- `src/components/XPBar.tsx`
- `src/lib/xp.ts`
- `src/app/tools/mnemonics/page.tsx`
- `src/app/tools/glossary/page.tsx`
- `src/app/api/ai/mnemonic/route.ts`
- `src/app/api/ai/glossary/route.ts`
- `src/app/api/glossary/route.ts`
- `src/app/api/xp/route.ts`

## Archivos modificados
- `tailwind.config.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/Navbar.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/tools/summaries/page.tsx`
- `src/app/tools/outlines/page.tsx`
- `src/app/tools/flashcards/page.tsx`
- `src/app/tools/schedules/page.tsx`
- `src/lib/prompts.ts`
- `prisma/schema.prisma`
- Varias rutas API para agregar addXP
