## Purpose

Certifica que un candidato materializa exactamente el plan estructural permitido antes de ejecutar validadores lingüísticos más costosos.

## ADDED Requirements

### Requirement: Estructura completa `0-A-0-A`
El validador SHALL exigir exactamente cuatro versos no vacíos, ordenados por sus cuatro roles y asociados al esquema fijo.

#### Scenario: Estructura válida
- **WHEN** el candidato tiene V1–V4 una sola vez y en orden
- **THEN** devuelve `VALIDO` con las comprobaciones estructurales realizadas

#### Scenario: Slot ausente o extra
- **WHEN** falta un verso, sobra otro o los roles están desordenados
- **THEN** devuelve `INVALIDO` con cada posición afectada

### Requirement: Plan materializado
El validador SHALL exigir que V2 y V4 terminen exactamente en sus palabras planificadas.

#### Scenario: Final modificado
- **WHEN** un verso rimante no termina en la palabra fijada
- **THEN** devuelve `INVALIDO` sin intentar sustituirla
