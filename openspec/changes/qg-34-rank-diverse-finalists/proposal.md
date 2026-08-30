## Why

Ordenar solo por nota puede devolver variaciones casi iguales. El resultado de `generate` debe contener las mejores cuartetas manteniendo diversidad y un orden estable.

## What Changes

- Añadir un ranker puro que filtre por umbral y seleccione top-K.
- Usar score como criterio principal y diversidad como criterio de selección y desempate.
- Garantizar orden determinista ante entradas y versiones iguales.
- Explicar inclusiones, exclusiones y penalizaciones de similitud.

## Capabilities

### New Capabilities

- `scoring/diverse-finalist-ranking`: selección ordenada y diversa de la lista final de cuartetas.

### Modified Capabilities

Ninguna.

## Impact

Depende de deduplicación, originalidad y scoring. Produce finalistas, no contenido aprobado.
