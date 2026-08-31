## Why

La generación debe empezar por el remate. Elegir primero la palabra final de V4 por significado evita llegar al final con una rima formal que contradice la enseñanza o el giro.

## What Changes

- Seleccionar candidatos aprobados para cerrar V4 a partir del plan semántico.
- Filtrar por significado, categoría, tonicidad y utilidad editorial para remate.
- Pedir al LLM que priorice exclusivamente opciones suministradas por el diccionario.
- Devolver selección, alternativas y razones trazables sin redactar versos.

## Capabilities

### New Capabilities

- `generation/v4-final-word-selection`: selección semántica de la palabra final del remate.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-05-model-approved-dictionary`, `qg-08-index-approved-rhyme-catalog` y `qg-10-plan-semantic-outline`.
