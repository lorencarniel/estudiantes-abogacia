## 1. Base de la aplicación

- [x] 1.1 Crear la estructura del paquete FastAPI, configuración por variables de entorno y servidor de estáticos; verificar que la aplicación arranque y responda su página inicial en una prueba de humo.
- [x] 1.2 Declarar y fijar las dependencias de backend, pruebas y frontend elegidas; verificar que la instalación reproducible finalice sin conflictos.
- [x] 1.3 Definir los modelos Pydantic para nodos, relaciones, mapa y errores públicos; verificar con pruebas unitarias casos válidos, IDs duplicados y relaciones con extremos inexistentes.

## 2. Ingreso y extracción de apuntes

- [x] 2.1 Implementar la validación mutuamente excluyente de PDF o texto y los límites configurables de entrada; verificar con pruebas los casos sin fuente, con ambas fuentes, tipo inválido y PDF de más de 20 MB.
- [x] 2.2 Implementar extracción en memoria con `pypdf`, normalización de texto y detección de contenido insuficiente; verificar con fixtures de PDF textual, vacío, escaneado, corrupto y protegido.
- [x] 2.3 Garantizar liberación de buffers y sanitización de errores/logs en rutas exitosas y fallidas; verificar mediante pruebas que cuerpos, nombres de archivo y texto extraído no se registren ni escriban al sistema de archivos.

## 3. Generación con IA

- [x] 3.1 Crear la interfaz del generador y una implementación server-side configurable para el proveedor seleccionado; verificar con un doble de prueba que la credencial no llegue al cliente y que se respeten timeout y cancelación.
- [x] 3.2 Construir el prompt y esquema estructurado con límites de nodos y etiquetas, tratando el apunte como datos no confiables; verificar mediante snapshots o aserciones que las instrucciones exijan contenido derivado del texto y JSON conforme al contrato.
- [x] 3.3 Validar y normalizar la respuesta del modelo, incluyendo un único reintento ante salida malformada; verificar con pruebas respuestas válidas, JSON inválido, referencias rotas, contenido insuficiente y segundo fallo.
- [x] 3.4 Implementar el endpoint de generación y su traducción de fallos a códigos y mensajes públicos; verificar con pruebas de integración éxito, error de extracción, credenciales ausentes, timeout y error del proveedor sin filtrar secretos ni trazas.

## 4. Experiencia web y visualización

- [x] 4.1 Construir el formulario adaptable con selector de PDF, alternativa de texto, límites visibles y validación accesible; verificar en viewport de escritorio y móvil que solo se envíe una fuente válida.
- [x] 4.2 Implementar los estados inicial, procesando, exitoso y fallido, bloqueando envíos duplicados y permitiendo corregir o reintentar; verificar cada transición con pruebas del frontend y navegación por teclado.
- [x] 4.3 Integrar `vis-network` para dibujar todos los nodos y relaciones con layout jerárquico, ajuste inicial, zoom, desplazamiento y restablecimiento; verificar con un grafo de prueba en interacción con mouse y emulación táctil.
- [x] 4.4 Implementar la exportación PNG mediante un render temporal que encuadre el grafo completo; verificar que el archivo descargado incluya nodos fuera del viewport actual y etiquetas legibles, y que la acción permanezca deshabilitada sin mapa.

## 5. Calidad, privacidad y documentación

- [x] 5.1 Añadir una prueba end-to-end del flujo de texto y otra del flujo PDF usando un proveedor simulado; verificar generación, navegación y descarga del PNG en resoluciones de escritorio y móvil.
- [x] 5.2 Revisar y probar límites de concurrencia, tamaño y resolución de exportación, además del rate limiting configurable; verificar respuestas controladas bajo solicitudes excedidas y que el proceso mantenga un uso de memoria acotado.
- [x] 5.3 Documentar instalación, variables, ejecución, pruebas, límites, formatos admitidos, ausencia de OCR y tratamiento efímero incluyendo el envío al proveedor; verificar que una instalación limpia pueda seguir la guía sin datos implícitos.
- [x] 5.4 Ejecutar el conjunto completo de lint, pruebas y validaciones de seguridad/dependencias definido por el proyecto; verificar que todos los comandos terminen correctamente y registrar cualquier excepción justificada.
