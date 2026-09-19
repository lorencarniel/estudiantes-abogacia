# Spec 007 - Features premium — Explore

## Features a implementar

### 1. Sistema de gamificación (XP, niveles, rachas)
- Cada acción otorga XP (generar resumen, completar quiz, ganar juego, etc.)
- Niveles con nombres temáticos jurídicos
- Racha diaria (ya existe studyStreak en stats, hay que hacerlo visual)
- Badges/logros por hitos
- Necesita: modelo UserXP en Prisma, API para registrar XP, componente visual en dashboard/navbar

### 2. Subrayador inteligente
- Al generar un resumen o esquema, la IA detecta los puntos clave y los resalta
- El usuario puede ver texto con highlights de colores (importante, definición, ejemplo, artículo)
- Necesita: modificar prompts de resumen/esquema para que devuelvan highlights, UI con colores

### 3. Generador de mnemotécnicos
- Nueva herramienta: pegás un concepto difícil y la IA genera reglas mnemotécnicas
- Acrónimos, frases, asociaciones visuales, historias
- Necesita: nuevo prompt, nueva ruta API, nueva página en tools

### 4. Glosario automático
- Al subir material, la IA extrae los términos jurídicos clave con definiciones
- Se acumula en un glosario personal buscable
- Necesita: modelo GlossaryTerm en Prisma, API para extraer/buscar, página de glosario

### 5. Exportar a PDF
- Exportar resúmenes, esquemas y flashcards a PDF descargable
- Necesita: librería de PDF del lado del cliente (html2pdf.js o jspdf)

### 6. Modo Pomodoro
- Timer de estudio integrado (25min estudio / 5min descanso)
- Se asocia al cronograma: cuando hacés click en "Estudiar", arranca el Pomodoro
- Necesita: componente PomodoroTimer, integración con schedules

### 7. Dark mode
- Toggle en navbar, persiste en localStorage
- Tailwind dark: variant
- Necesita: ThemeProvider, clases dark: en todos los componentes, toggle UI

## Estado actual del codebase
- 15 herramientas en tools/
- Dashboard con grid de herramientas + actividad reciente + progreso
- Navbar con links de navegación
- Tailwind CSS con colores primary custom
- No hay dark mode ni sistema de XP
- Stats ya trackea studyStreak, quizzes y games
