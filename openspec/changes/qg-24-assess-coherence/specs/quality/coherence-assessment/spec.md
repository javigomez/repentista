## Purpose

Mide si los cuatro versos mantienen referentes y una progresión comprensible desde presentación hasta remate.

## ADDED Requirements

### Requirement: Evaluación de unidad narrativa
El sistema SHALL puntuar continuidad de escena, referentes, causalidad y progresión de roles con evidencias localizadas.

#### Scenario: Cuarteta coherente
- **WHEN** V1–V4 comparten escena y cada transición contribuye al sentido final
- **THEN** se devuelve nota, mapa breve de progresión y confianza

#### Scenario: Ruptura de referente
- **WHEN** un verso introduce o cambia un sujeto sin apoyo comprensible
- **THEN** la observación identifica la transición y reduce la nota según rúbrica

### Requirement: Independencia de otras dimensiones
El evaluador MUST NOT puntuar métrica, rima, humor o naturalidad como sustitutos de coherencia.

#### Scenario: Texto gracioso pero inconexo
- **WHEN** hay humor local sin unidad narrativa
- **THEN** la nota de coherencia refleja la ruptura aunque otras dimensiones puedan puntuar alto
