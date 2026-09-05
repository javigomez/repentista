# quality/cantability-assessment Specification

## Purpose
Evalúa la fluidez oral y el pulso interno de versos ya métricamente válidos sin convertir perfiles rítmicos preferidos en bloqueos.

## Requirements

### Requirement: Evaluación prosódica blanda
El sistema SHALL devolver nota, perfil rítmico aproximado, puntos de tropiezo y confianza para cada verso válido.

#### Scenario: Pulso fluido
- **WHEN** el verso puede pronunciarse naturalmente con la séptima posición tónica
- **THEN** recibe una evaluación favorable con el perfil observado

#### Scenario: Métrica válida pero trabada
- **WHEN** acumulaciones o pausas dificultan el pulso aunque el recuento sea correcto
- **THEN** se localizan los tropiezos sin invalidar la métrica

### Requirement: Precondición métrica
El evaluador SHALL ejecutarse solo sobre versos con resultado métrico `VALIDO`.

#### Scenario: Métrica dudosa
- **WHEN** el verso es `DUDOSO` o `INVALIDO`
- **THEN** no se produce nota de cantabilidad
