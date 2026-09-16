## Purpose

Convertir el contenido de un apunte en una estructura confiable de conceptos y relaciones que pueda representarse como un mapa conceptual.

## ADDED Requirements

### Requirement: Generación basada en el apunte
El sistema SHALL usar un modelo de lenguaje para identificar conceptos principales del texto aportado y relaciones explícitas y legibles entre ellos, sin incorporar contenido ajeno como si perteneciera al apunte.

#### Scenario: Texto apto para resumir
- **WHEN** el texto contiene contenido suficiente para identificar ideas relacionadas
- **THEN** el sistema devuelve conceptos concisos y relaciones derivadas del material aportado

#### Scenario: Texto insuficiente
- **WHEN** el texto no contiene contenido suficiente para construir un mapa significativo
- **THEN** el sistema no devuelve un mapa vacío o engañoso e informa que se necesita un apunte más completo

### Requirement: Contrato estructurado del mapa
El sistema MUST representar el resultado mediante una estructura JSON con identificadores de nodo únicos, etiquetas de concepto no vacías y relaciones cuyos extremos referencien nodos existentes.

#### Scenario: Respuesta válida del modelo
- **WHEN** el modelo devuelve conceptos y relaciones que cumplen el contrato
- **THEN** el sistema entrega al cliente una estructura lista para visualizar

#### Scenario: Relación inválida
- **WHEN** una relación referencia un concepto inexistente o un nodo carece de identificador o etiqueta
- **THEN** el sistema no entrega esa estructura inválida como mapa exitoso

#### Scenario: Respuesta no estructurada
- **WHEN** el proveedor devuelve contenido que no puede interpretarse conforme al contrato JSON
- **THEN** el sistema responde con un error recuperable y permite volver a intentar

### Requirement: Manejo seguro de la integración de IA
El sistema MUST invocar al proveedor de IA desde el servidor, MUST mantener las credenciales fuera del navegador y SHALL comunicar fallos del proveedor sin exponer secretos ni detalles internos.

#### Scenario: Generación disponible
- **WHEN** el proveedor procesa correctamente una solicitud válida
- **THEN** el servidor devuelve el mapa sin revelar la credencial usada

#### Scenario: Proveedor no disponible
- **WHEN** el proveedor rechaza la solicitud, excede el tiempo de espera o no está disponible
- **THEN** el sistema informa que no pudo generar el mapa y ofrece la posibilidad de reintentar

#### Scenario: Configuración ausente
- **WHEN** el servidor no dispone de credenciales válidas para el proveedor
- **THEN** la solicitud falla de forma controlada sin incluir secretos ni trazas internas en la respuesta
