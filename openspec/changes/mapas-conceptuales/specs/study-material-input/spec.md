## Purpose

Permitir que una persona aporte apuntes en formatos accesibles y obtener texto procesable sin conservar de forma permanente su material de estudio.

## ADDED Requirements

### Requirement: Ingreso alternativo de apuntes
El sistema SHALL permitir iniciar una generación proporcionando exactamente una de estas fuentes: un archivo PDF o texto plano pegado.

#### Scenario: Ingreso mediante PDF
- **WHEN** el usuario selecciona un PDF válido y solicita generar el mapa
- **THEN** el sistema acepta el archivo como fuente del apunte

#### Scenario: Ingreso mediante texto
- **WHEN** el usuario pega texto no vacío y solicita generar el mapa sin adjuntar un PDF
- **THEN** el sistema acepta el texto como fuente del apunte

#### Scenario: No se proporciona contenido
- **WHEN** el usuario solicita generar un mapa sin un PDF y sin texto no vacío
- **THEN** el sistema rechaza la solicitud con un mensaje que indica cómo aportar contenido

#### Scenario: Se proporcionan ambas fuentes
- **WHEN** el usuario solicita generar un mapa con un PDF y texto pegado simultáneamente
- **THEN** el sistema solicita elegir una única fuente y no inicia la generación

### Requirement: Validación de archivos PDF
El sistema MUST aceptar únicamente archivos PDF de hasta 20 MB y SHALL informar los rechazos en lenguaje comprensible sin procesar el archivo con el modelo de lenguaje.

#### Scenario: PDF dentro del límite
- **WHEN** el usuario proporciona un archivo PDF reconocible cuyo tamaño no supera 20 MB
- **THEN** el sistema continúa con la extracción de texto

#### Scenario: PDF demasiado grande
- **WHEN** el usuario proporciona un archivo de más de 20 MB
- **THEN** el sistema rechaza el archivo e informa el límite de 20 MB

#### Scenario: Tipo de archivo no admitido
- **WHEN** el usuario proporciona un archivo que no es un PDF reconocible
- **THEN** el sistema rechaza el archivo e informa que solo admite PDF

### Requirement: Extracción de texto seleccionable
El sistema SHALL extraer el texto disponible del PDF y MUST rechazar documentos sin suficiente texto utilizable para generar un mapa.

#### Scenario: PDF con texto seleccionable
- **WHEN** el PDF contiene texto seleccionable no vacío
- **THEN** el sistema utiliza el texto extraído como entrada para la generación

#### Scenario: PDF escaneado sin texto
- **WHEN** el PDF contiene únicamente imágenes o no produce texto utilizable
- **THEN** el sistema no intenta OCR e informa que esta versión requiere un PDF con texto seleccionable o texto pegado

#### Scenario: PDF ilegible o protegido
- **WHEN** el contenido del PDF no puede abrirse o extraerse
- **THEN** el sistema detiene el procesamiento y presenta un error accionable sin invocar el modelo de lenguaje

### Requirement: Procesamiento efímero y sin identidad
El sistema MUST permitir el procesamiento sin cuenta de usuario y MUST descartar el archivo, el texto extraído o pegado y los datos intermedios del apunte al finalizar la solicitud, sin almacenarlos en una base de datos ni en un historial de la aplicación.

#### Scenario: Procesamiento exitoso
- **WHEN** finaliza correctamente la generación de un mapa
- **THEN** el material fuente y sus datos intermedios dejan de estar retenidos por la aplicación tras responder

#### Scenario: Procesamiento fallido
- **WHEN** la extracción o la generación termina con error
- **THEN** el sistema descarta el material fuente y sus datos intermedios tras responder con el error

#### Scenario: Acceso anónimo
- **WHEN** una persona visita la aplicación y aporta un apunte
- **THEN** puede completar el flujo sin registrarse ni iniciar sesión
