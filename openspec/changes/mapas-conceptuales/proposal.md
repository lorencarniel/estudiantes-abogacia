## Why

Los estudiantes de abogacía necesitan transformar apuntes extensos en una representación visual que facilite identificar ideas principales y sus vínculos. Este primer cambio establece la experiencia mínima del producto: generar, consultar y descargar un mapa conceptual a partir de material propio, sin exigir una cuenta ni conservar el contenido.

## What Changes

- Incorporar una pantalla pública y adaptable a dispositivos móviles para cargar un PDF de hasta 20 MB o pegar texto plano.
- Extraer texto de PDFs con contenido seleccionable y comunicar de forma clara archivos inválidos, demasiado grandes, vacíos o escaneados sin texto utilizable.
- Generar mediante un modelo de lenguaje una estructura validada de conceptos y relaciones basada en el contenido aportado.
- Mostrar el resultado como un mapa conceptual interactivo y legible, con zoom y desplazamiento.
- Permitir descargar el mapa visible como imagen.
- Procesar el apunte en memoria durante la solicitud y descartarlo al finalizar, sin base de datos, cuentas ni historial.
- Mantener fuera de alcance tarjetas de memoria, cuestionarios, cronogramas, audio, video, juegos, colaboración, aplicación móvil nativa y definición de hosting.

## Capabilities

### New Capabilities

- `study-material-input`: ingreso y validación de apuntes en PDF o texto, extracción de texto y descarte del material procesado.
- `concept-map-generation`: transformación del texto del apunte en una estructura validada de conceptos y relaciones mediante un modelo de lenguaje.
- `concept-map-visualization`: presentación interactiva y adaptable del mapa conceptual, incluida su descarga como imagen.

### Modified Capabilities

Ninguna; el proyecto todavía no posee capacidades especificadas.

## Impact

- Se incorpora una aplicación web sin autenticación compuesta por un backend FastAPI y un frontend HTML/CSS/JavaScript.
- Se añade una dependencia de extracción de PDF (`pypdf` o `pdfplumber`), una integración server-side con la API de un modelo de lenguaje y una biblioteca de visualización de grafos.
- Se definen endpoints para recibir el material y devolver la estructura del mapa, junto con validaciones, límites operativos y respuestas de error.
- No se introduce base de datos ni almacenamiento permanente; las credenciales del proveedor de IA permanecen exclusivamente en el servidor.
