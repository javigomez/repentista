## Purpose

Expone una consulta diagnóstica al catálogo consonante para entender familias, candidatas y exclusiones antes de generar versos.

## ADDED Requirements

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
