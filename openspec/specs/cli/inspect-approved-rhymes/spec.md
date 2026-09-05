# cli/inspect-approved-rhymes Specification

## Purpose
Expone una consulta diagnóstica al catálogo consonante para entender familias, candidatas y exclusiones antes de generar versos.

## Requirements

### Requirement: Inspección de familia aprobada
La CLI SHALL aceptar palabra, versión de diccionario y filtros opcionales, y SHALL devolver análisis tónico, cola fonética, familia y candidatas aprobadas.

#### Scenario: Palabra con rimas
- **WHEN** la palabra está aprobada y su familia contiene opciones compatibles
- **THEN** stdout devuelve la lista determinista con categoría, roles y versión

#### Scenario: Familia sin pareja
- **WHEN** la palabra existe pero ningún candidato supera filtros
- **THEN** devuelve lista vacía y exclusiones explicadas sin error de infraestructura

### Requirement: Fallos confiables
La CLI SHALL distinguir palabra desconocida, versión ausente y análisis dudoso mediante estados y códigos de salida.

#### Scenario: Palabra desconocida
- **WHEN** la palabra no pertenece al snapshot solicitado
- **THEN** el comando no inventa una familia y termina con diagnóstico de entrada/contenido

### Requirement: Sin generación
El comando MUST NOT invocar un LLM ni redactar versos.

#### Scenario: Consulta offline
- **WHEN** no hay proveedor configurado
- **THEN** la inspección funciona usando solo diccionario y análisis lingüístico

### Requirement: Familia respaldada por el catálogo
La inspección SHALL obtener la pertenencia, candidatas, orden y exclusiones desde el catálogo consonante aprobado de la versión solicitada; MUST NOT reconstruir una familia alternativa desde el diccionario ni desde sufijos de la palabra.

#### Scenario: Catálogo y análisis consistentes
- **WHEN** la palabra aprobada pertenece a una familia consonante indexada y su análisis coincide con la cola registrada
- **THEN** la salida devuelve la cola fonética calculada, la clave de familia aprobada y las candidatas en el orden estable del catálogo

#### Scenario: Datos adversariales del diccionario
- **WHEN** varias palabras del diccionario parecen compartir un sufijo ortográfico pero el catálogo no las agrupa
- **THEN** la inspección conserva la decisión del catálogo y no las presenta como candidatas

### Requirement: Inconsistencias y exclusiones auditables
La inspección SHALL rechazar de forma explícita una discrepancia entre el análisis confiable y la familia aprobada, y SHALL conservar las exclusiones relevantes producidas al consultar el catálogo.

#### Scenario: Familia aprobada inconsistente
- **WHEN** la cola fonética confiable de la palabra no coincide con la familia indexada para esa versión
- **THEN** el comando termina con estado no satisfactorio y un diagnóstico que contiene ambas claves sin escoger una silenciosamente

#### Scenario: Miembro no analizable
- **WHEN** el catálogo excluye un miembro por análisis dudoso o metadatos incompatibles
- **THEN** la salida incluye la exclusión y su motivo en vez de omitir el miembro silenciosamente

### Requirement: Consulta determinista y offline
La inspección SHALL funcionar sin proveedor generativo y SHALL producir el mismo resultado para el mismo snapshot y filtros.

#### Scenario: Proveedor ausente
- **WHEN** no hay LLM configurado y están disponibles el snapshot, el analizador y el catálogo
- **THEN** la consulta completa termina sin intentar acceder a generación, red ni estado externo
