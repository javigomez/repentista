# content/approved-consonant-rhyme-catalog Specification

## Purpose
Agrupa palabras aprobadas por terminación consonante fonética y permite elegir parejas rimantes de forma determinista y editorialmente controlada.

## Requirements

### Requirement: Familias consonantes aprobadas
El sistema SHALL indexar desde la última vocal tónica hasta el final fonético y SHALL incluir únicamente entradas aprobadas y consistentes con su análisis.

#### Scenario: Construcción válida
- **WHEN** dos palabras aprobadas comparten la misma cola consonante normalizada
- **THEN** aparecen en la misma familia con su versión y metadatos editoriales

#### Scenario: Pareja solo asonante
- **WHEN** dos palabras comparten vocales pero no consonantes desde la última tónica
- **THEN** no aparecen como pareja en el catálogo

### Requirement: Consulta filtrada
El sistema SHALL buscar rimas por palabra o familia y aplicar filtros de categoría y rol sin alterar el catálogo.

#### Scenario: Sin pareja viable
- **WHEN** ninguna entrada aprobada supera los filtros
- **THEN** se devuelve una lista vacía explicada, no palabras inventadas
