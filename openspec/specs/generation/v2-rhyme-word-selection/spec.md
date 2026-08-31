# generation/v2-rhyme-word-selection Specification

## Purpose
Elige dentro de la familia de V4 una palabra aprobada capaz de preparar el remate desde V2 sin inventar ni relajar la consonancia.

## Requirements

### Requirement: Pareja consonante aprobada
El sistema SHALL seleccionar V2 exclusivamente entre las parejas del catálogo que comparten familia consonante con V4 y permiten el rol de preparación.

#### Scenario: Pareja viable
- **WHEN** existen candidatas y el selector elige una de la lista
- **THEN** se conserva palabra, familia, categoría, razón y alternativas ordenadas

#### Scenario: Pareja fuera de familia
- **WHEN** la respuesta propone una palabra no incluida o solo asonante
- **THEN** se rechaza la selección como salida inválida

### Requirement: Variedad morfológica
El sistema SHALL aplicar la política editorial contra parejas morfológicamente repetitivas antes de pedir prioridad semántica.

#### Scenario: Solo parejas penalizadas
- **WHEN** todas las parejas incumplen una restricción obligatoria
- **THEN** la rama falla y permite probar otra palabra de V4
