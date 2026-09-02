## Why

Una vez fijada V4, V2 necesita una pareja consonante que prepare el remate sin caer en ripio ni repetición morfológica. La elección debe restringirse al catálogo aprobado.

## What Changes

- Consultar las parejas aprobadas de la palabra final de V4.
- Filtrar por función de preparación, categoría, variedad morfológica y compatibilidad semántica.
- Permitir al LLM ordenar solo la lista cerrada recibida.
- Devolver la palabra de V2 y alternativas o un fallo explícito si no hay pareja viable.

## Capabilities

### New Capabilities

- `generation/v2-rhyme-word-selection`: selección de la pareja rimante aprobada para el verso de preparación.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-08-index-approved-rhyme-catalog` y `qg-11-select-v4-final-word`. Solo contempla V2↔V4 en `0-A-0-A`.
