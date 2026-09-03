# validation/batch-duplicate-detection Specification

## Purpose
Detecta candidatos repetidos dentro de una ejecución para que el scoring y top-K operen sobre alternativas realmente distintas.

## Requirements

### Requirement: Canonización determinista
El sistema SHALL construir una firma estable a partir de texto normalizado, finales y estructura, y SHALL agrupar firmas iguales.

#### Scenario: Duplicado exacto normalizado
- **WHEN** dos candidatos solo difieren en mayúsculas, espacios o puntuación no significativa
- **THEN** uno queda canónico y el otro se marca duplicado con referencia al primero

#### Scenario: Candidatos distintos
- **WHEN** cambia de forma significativa cualquier verso
- **THEN** ambos permanecen para evaluaciones posteriores

### Requirement: Selección estable del canónico
El sistema SHALL elegir siempre el mismo representante ante el mismo lote y orden de identidad.

#### Scenario: Repetición de ejecución
- **WHEN** se procesa el mismo lote con la misma versión
- **THEN** los grupos y representantes son idénticos
