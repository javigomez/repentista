# quality/batch-originality-assessment Specification

## Purpose
Evalúa la novedad relativa de cada candidato frente al resto del lote después de retirar duplicados equivalentes.

## Requirements

### Requirement: Comparación multidimensional del lote
El sistema SHALL comparar parejas de rima, anclas, sintaxis, personajes y mecanismo de remate, y SHALL devolver nota y vecinos similares.

#### Scenario: Candidato claramente distinto
- **WHEN** sus rasgos principales no repiten los de otros supervivientes
- **THEN** obtiene una nota favorable con los rasgos distintivos

#### Scenario: Variación superficial
- **WHEN** cambia pocas palabras pero conserva imagen, estructura y chiste de otro candidato
- **THEN** el informe vincula ambos y reduce la originalidad según rúbrica

### Requirement: Alcance de lote
El sistema SHALL declarar que la evaluación solo cubre el lote actual.

#### Scenario: Sin banco histórico
- **WHEN** se calcula originalidad
- **THEN** el resultado incluye el identificador del lote y no afirma novedad global
