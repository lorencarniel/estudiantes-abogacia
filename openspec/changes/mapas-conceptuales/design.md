## Context

El repositorio solo contiene la configuración inicial de OpenSpec y no posee una aplicación existente, por lo que este cambio define la primera arquitectura ejecutable. La solución debe cubrir tres capacidades nuevas (`study-material-input`, `concept-map-generation` y `concept-map-visualization`) manteniendo una operación anónima, sin base de datos y apta para un despliegue web futuro aún no elegido.

El archivo o texto se procesa de forma efímera, pero el contenido necesariamente se transmite al proveedor de IA para generar el mapa. La aplicación debe evitar persistencia y registros de contenido; la política de retención del proveedor deberá configurarse y comunicarse conforme al servicio que se seleccione.

## Goals / Non-Goals

**Goals:**

- Establecer una arquitectura mínima, mantenible y comprobable para frontend, extracción de PDF e integración de IA.
- Validar todas las fronteras del sistema: carga, texto extraído, salida del modelo y respuesta enviada al navegador.
- Mantener las credenciales y la llamada al modelo exclusivamente del lado servidor.
- Permitir sustituir proveedor de IA o biblioteca de visualización sin alterar el contrato funcional.
- Evitar que el contenido del apunte aparezca en almacenamiento permanente, logs o mensajes de error.

**Non-Goals:**

- Introducir procesamiento asíncrono, colas, almacenamiento de archivos, caché o recuperación de sesiones.
- Diseñar autenticación, cuotas por usuario, historial o sincronización entre dispositivos.
- Resolver OCR, edición manual del grafo o persistencia de mapas.
- Elegir proveedor de hosting o automatizar infraestructura de producción.

## Decisions

### 1. Aplicación monolítica liviana con FastAPI y frontend estático

FastAPI expondrá un endpoint de generación y servirá los archivos HTML, CSS y JavaScript desde el mismo origen. El navegador enviará una solicitud `multipart/form-data` con un campo de archivo o uno de texto y recibirá un JSON normalizado con nodos y relaciones.

Esto minimiza configuración, evita CORS en la primera versión y permite desplegar una única unidad. Se descarta separar frontend y backend porque añade coordinación de despliegues sin aportar valor al alcance inicial. También se descarta renderizar el mapa en el servidor porque la interacción y descarga pueden resolverse en el navegador.

El endpoint será una operación síncrona desde la perspectiva HTTP, con timeouts explícitos para la API externa. No se añade una cola porque no existe identidad ni almacenamiento desde el cual recuperar trabajos diferidos.

### 2. Validación temprana y extracción acotada con `pypdf`

El servidor verificará que exista exactamente una fuente, limitará el cuerpo del PDF a 20 MB, comprobará la firma/formato y extraerá texto página por página con `pypdf`. Se normalizará espacio en blanco y se exigirá contenido mínimo antes de llamar al modelo. El texto pegado también tendrá un límite configurable de caracteres para controlar latencia, memoria y costo; la interfaz mostrará el límite efectivo.

Se elige `pypdf` por cubrir PDFs con capa de texto sin dependencias nativas pesadas. `pdfplumber` queda como alternativa si las pruebas con documentos jurídicos demuestran una extracción significativamente mejor. OCR se rechaza explícitamente: requiere herramientas, costo y decisiones de calidad adicionales.

Los archivos se leerán en memoria y se liberarán al completar o fallar la solicitud. Se configurará el servidor para no registrar cuerpos, texto extraído ni respuestas completas del proveedor.

### 3. Adaptador de proveedor y salida estructurada validada

La integración de IA se aislará detrás de una interfaz de generación. El prompt indicará que el texto es datos no confiables, pedirá resumir únicamente el apunte y exigirá un objeto JSON con:

- `nodes`: objetos con `id` único y `label` no vacío;
- `edges`: objetos con `source`, `target` y una etiqueta de relación;
- límites configurables de cantidad y longitud para mantener legibilidad.

Cuando el proveedor soporte salida estructurada se utilizará un esquema JSON; en todos los casos, Pydantic validará localmente la respuesta y verificará unicidad y referencias. Se permitirá un único intento de corrección/reintento para una salida malformada, sin encadenar reintentos ilimitados. Errores posteriores se transformarán en una respuesta estable, segura y recuperable para el cliente.

Se prefiere un adaptador pequeño frente a acoplar rutas y modelos al SDK del proveedor. Usar texto libre y parsearlo de manera tolerante se descarta porque puede producir grafos incoherentes o fallos difíciles de observar.

### 4. Grafo interactivo con `vis-network`

El frontend utilizará `vis-network` con un layout jerárquico por defecto, navegación con mouse/táctil, ajuste automático inicial y controles accesibles de zoom/restablecimiento. Esta opción representa relaciones generales mejor que Markmap, cuya estructura primaria es un árbol y puede perder vínculos cruzados entre conceptos.

La interfaz se implementará con HTML semántico y CSS adaptable, incluirá estados de carga y error, y bloqueará solicitudes duplicadas. El mapa ocupará un contenedor con tamaño mínimo en móvil y los controles permanecerán accesibles fuera del lienzo.

### 5. Exportación completa desde el cliente

La descarga generará un PNG en el navegador a partir del lienzo del grafo. Antes de exportar, se calculará el encuadre de todos los nodos y se renderizará una superficie temporal de resolución suficiente, con fondo explícito, para que el archivo incluya el grafo completo y no solo el viewport actual. Luego se restaurará la vista interactiva.

La exportación del lado cliente evita enviar nuevamente datos al servidor. Una captura directa del viewport se descarta porque puede omitir nodos cuando el usuario está usando zoom.

### 6. Privacidad y observabilidad por metadatos

No habrá tablas, almacenamiento de objetos ni directorios de uploads. Las métricas y logs incluirán solo metadatos operativos necesarios —duración, tamaño, cantidad de páginas/nodos y categoría de error— y nunca nombres de archivo, texto del apunte, prompts completos o contenido generado. Las respuestas de error usarán códigos propios y mensajes públicos, sin trazas ni mensajes crudos del proveedor.

La configuración documentará variables para credenciales, modelo, timeouts y límites. La clave nunca se incorporará al JavaScript ni al repositorio. Para producción se deberá seleccionar una modalidad del proveedor compatible con la política de privacidad declarada.

## Risks / Trade-offs

- **[La extracción de PDFs complejos puede alterar columnas, notas o encabezados]** → Normalizar por página, probar documentos representativos y orientar al usuario a pegar texto cuando el resultado no sea utilizable.
- **[Un PDF con texto mínimo puede ser en realidad un escaneo parcial]** → Aplicar un umbral documentado y devolver una explicación específica; no prometer detección perfecta sin OCR.
- **[El modelo puede omitir, deformar o inventar relaciones]** → Restringir el prompt al material, validar estructura y mantener etiquetas concisas; aceptar que la exactitud semántica no puede garantizarse automáticamente.
- **[Solicitudes anónimas pueden ocasionar abuso o costos inesperados]** → Imponer límites de tamaño, timeouts y concurrencia; dejar rate limiting por IP configurable para el despliegue aunque no exista cuenta.
- **[Procesar todo en memoria limita concurrencia]** → Acotar entradas y liberar referencias en bloques de finalización; reevaluar streaming o trabajos asíncronos solo cuando existan métricas reales.
- **[La descarga de grafos grandes puede consumir memoria del dispositivo]** → Limitar nodos y resolución máxima, y mostrar un error recuperable si el navegador no puede crear la imagen.
- **[“No almacenar” no equivale a que un proveedor externo no retenga datos]** → Elegir/configurar una modalidad adecuada y explicar al usuario que el texto se envía al servicio de IA para su procesamiento.

## Migration Plan

1. Incorporar la aplicación y sus dependencias con configuración de desarrollo basada en variables de entorno.
2. Ejecutar pruebas unitarias y de integración con el proveedor simulado, además de pruebas manuales con PDFs representativos.
3. Configurar credenciales y límites en el entorno elegido, verificar que el logging excluya contenido y realizar una prueba de humo.
4. Publicar la única unidad web. Al ser la primera versión no existen datos ni clientes anteriores que migrar.

El rollback consiste en retirar la unidad desplegada o volver a la revisión previa; no requiere migración inversa ni limpieza de base de datos. Cualquier archivo temporal accidental deberá eliminarse como parte del apagado, aunque el diseño no prevé crearlos.
