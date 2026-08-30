## Purpose

Certifica que V2 y V4 comparten una familia de rima consonante aprobada y que no se exige otra relación en el esquema inicial.

## ADDED Requirements

### Requirement: Consonancia V2–V4
El validador SHALL comparar la secuencia fonética desde la última vocal tónica y exigir familias iguales y aprobadas para V2 y V4.

#### Scenario: Rima consonante válida
- **WHEN** ambas palabras finales comparten exactamente la misma cola consonante y familia aprobada
- **THEN** devuelve `VALIDO` con colas, familia y versión

#### Scenario: Solo asonancia
- **WHEN** coinciden vocales pero difiere alguna consonante de la cola
- **THEN** devuelve `INVALIDO` indicando que asonancia no está soportada

### Requirement: Posiciones no rimantes
El validador SHALL ignorar cualquier coincidencia accidental de V1 o V3 como requisito.

#### Scenario: V1 rima accidentalmente
- **WHEN** V1 comparte familia con A pero V2 y V4 cumplen
- **THEN** la coincidencia se informa opcionalmente sin invalidar el esquema
