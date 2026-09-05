## Purpose

Garantiza que la inspección diagnóstica de rimas refleje exactamente el catálogo consonante aprobado y explique cualquier inconsistencia sin crear reglas fonéticas paralelas.

## ADDED Requirements

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

