# scoring/versioned-quality-rubric Specification

## Purpose
Agrega evaluaciones blandas ya calculadas en una puntuación determinista, versionada y explicable para candidatos formalmente válidos.

## Requirements

### Requirement: Score solo para elegibles
El sistema SHALL calcular score únicamente cuando todos los validadores duros son `VALIDO` y están presentes las dimensiones requeridas.

#### Scenario: Candidato completo
- **WHEN** un candidato válido contiene todas las evaluaciones aceptadas por la rúbrica
- **THEN** se devuelve total, desglose, pesos, versión y explicación matemática

#### Scenario: Bloqueo duro
- **WHEN** cualquier validador es `DUDOSO` o `INVALIDO`
- **THEN** el puntuador rechaza la operación y no asigna total

### Requirement: Rúbrica versionada
Los pesos SHALL sumar 100 y el cálculo SHALL ser estable para la misma entrada y versión.

#### Scenario: Dimensión ausente
- **WHEN** falta una dimensión obligatoria o su confianza no supera la política
- **THEN** el resultado indica score incompleto en vez de imputar una nota silenciosamente
