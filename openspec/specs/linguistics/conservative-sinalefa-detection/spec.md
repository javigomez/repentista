# linguistics/conservative-sinalefa-detection Specification

## Purpose
Identifica uniones vocálicas naturales entre palabras y conserva la evidencia necesaria para un recuento métrico conservador.

## Requirements

### Requirement: Clasificación de límites vocálicos
El sistema SHALL analizar cada frontera entre palabras y clasificarla como `APLICADA`, `NO_APLICADA` o `DUDOSA` con una razón versionada.

#### Scenario: Sinalefa natural
- **WHEN** una vocal final y una vocal inicial cumplen una regla conservadora no bloqueada por pausa
- **THEN** se devuelve una unión aplicada con las sílabas afectadas

#### Scenario: Unión discutible
- **WHEN** el recuento dependería de una excepción no autorizada o una pausa fuerte
- **THEN** se devuelve `DUDOSA` y nunca se aplica silenciosamente

### Requirement: Licencias prohibidas
El detector MUST NOT crear sinéresis, diéresis ni hiatos artificiales.

#### Scenario: Licencia necesaria para cuadrar
- **WHEN** solo una licencia prohibida reduciría el recuento
- **THEN** el detector conserva las sílabas originales y señala el motivo
