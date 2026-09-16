# Mapas conceptuales para estudiantes de abogacía

Aplicación FastAPI sin cuentas ni base de datos que convierte un PDF con texto seleccionable o texto pegado en un mapa conceptual interactivo.

## Requisitos e instalación

- Python 3.12 y Node.js 20.
- `python -m venv .venv && source .venv/bin/activate`
- `python -m pip install -e '.[dev]'`
- `npm install` (las versiones de visualización y pruebas web están fijadas en `package.json`).

## Configuración

Todas las variables son opcionales salvo la credencial para generación real:

| Variable | Predeterminado | Uso |
|---|---:|---|
| `OPENAI_API_KEY` | — | Credencial solo del servidor; nunca se entrega al navegador. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Modelo con salida estructurada. |
| `OPENAI_TIMEOUT_SECONDS` | `30` | Timeout del proveedor. |
| `MAX_PDF_BYTES` | `20971520` | Límite del PDF (20 MB). |
| `MAX_TEXT_CHARS` | `100000` | Límite de texto pegado. |
| `MIN_TEXT_CHARS` | `80` | Umbral de contenido útil. |
| `MAX_NODES` | `30` | Nodos máximos. |
| `MAX_CONCURRENT_REQUESTS` | `4` | Generaciones simultáneas. |
| `RATE_LIMIT_REQUESTS` | `10` | Solicitudes por ventana e IP. |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Ventana del rate limit. |
| `MAX_EXPORT_PIXELS` | `16000000` | Memoria máxima aproximada del PNG. |

## Ejecución y pruebas

```bash
uvicorn app.main:app --reload
python -m pytest
ruff check .
npm test
npm run test:e2e
pip-audit
```

Abrir <http://127.0.0.1:8000>. El proveedor se sustituye por un doble en las pruebas: no consumen la API real.

## Formatos, privacidad y límites

Solo se aceptan PDF de hasta 20 MB con capa de texto o texto plano. **No hay OCR**: para escaneos se debe extraer y pegar el texto. El archivo y el texto se mantienen en memoria únicamente durante la solicitud, sin historial ni almacenamiento permanente. Para producir el mapa, el texto se envía a OpenAI; antes de producción se debe elegir una configuración del proveedor compatible con la política de privacidad requerida. Los logs y errores públicos excluyen nombres de archivo, contenido, prompts, credenciales, respuestas crudas y trazas.
