## Purpose

Presentar el mapa generado de manera visual, interactiva y legible, y permitir conservar una copia portable como imagen.

## ADDED Requirements

### Requirement: Visualización del mapa conceptual
El sistema SHALL representar cada concepto como un nodo y cada relación como una conexión identificable, con texto legible y una disposición que permita comprender el mapa.

#### Scenario: Mapa generado
- **WHEN** el cliente recibe una estructura de mapa válida
- **THEN** muestra todos sus conceptos y relaciones en una vista de grafo

#### Scenario: Etiquetas extensas
- **WHEN** un concepto o una relación necesita más espacio que una etiqueta breve
- **THEN** la vista preserva la legibilidad sin ocultar permanentemente el contenido textual

### Requirement: Navegación interactiva
El sistema SHALL permitir ampliar, reducir y desplazar el mapa mediante controles apropiados para puntero y pantalla táctil.

#### Scenario: Exploración con puntero
- **WHEN** el usuario utiliza un navegador de escritorio
- **THEN** puede aplicar zoom y desplazarse para inspeccionar distintas partes del mapa

#### Scenario: Exploración móvil
- **WHEN** el usuario abre el resultado en una pantalla móvil compatible
- **THEN** puede navegar el mapa y acceder a las acciones principales sin desbordamiento que impida su uso

### Requirement: Descarga como imagen
El sistema SHALL permitir descargar una imagen que contenga el mapa conceptual completo y conserve etiquetas legibles.

#### Scenario: Descarga exitosa
- **WHEN** el usuario activa la acción de descarga después de generar el mapa
- **THEN** el navegador descarga un archivo de imagen que incluye todos los nodos y relaciones del mapa

#### Scenario: Descarga antes de generar
- **WHEN** todavía no existe un mapa válido
- **THEN** la acción de descarga no está disponible

### Requirement: Estados comprensibles del flujo
El sistema SHALL distinguir visualmente los estados inicial, de procesamiento, exitoso y fallido, y MUST impedir envíos duplicados mientras una generación está en curso.

#### Scenario: Generación en curso
- **WHEN** el sistema está extrayendo o generando el mapa
- **THEN** la interfaz muestra progreso indeterminado y deshabilita un nuevo envío

#### Scenario: Error recuperable
- **WHEN** la solicitud falla por validación, extracción o generación
- **THEN** la interfaz conserva una vía para corregir la entrada o reintentar y muestra un mensaje accionable
