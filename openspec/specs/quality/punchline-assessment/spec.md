# quality/punchline-assessment Specification

## Purpose
Evalúa si V4 funciona como resolución o giro de la expectativa construida por V1–V3, independientemente de cuánto humor produzca.

## Requirements

### Requirement: Eficacia del remate
El sistema SHALL identificar expectativa previa, resolución de V4, grado de giro y dependencia del contexto, y SHALL devolver nota y evidencias.

#### Scenario: Remate preparado y resuelto
- **WHEN** V1–V3 crean una expectativa que V4 transforma o resuelve
- **THEN** el informe describe ambas partes y asigna nota según rúbrica

#### Scenario: Cierre meramente descriptivo
- **WHEN** V4 continúa la escena sin resolver ni cambiar expectativa
- **THEN** la evaluación señala ausencia de remate aunque el verso sea correcto

### Requirement: Independencia del humor
El evaluador MUST NOT exigir que un buen remate sea necesariamente gracioso.

#### Scenario: Remate claro no humorístico
- **WHEN** V4 resuelve con claridad pero sin efecto cómico
- **THEN** puede obtener buena nota de remate y dejar humor a su evaluador específico
