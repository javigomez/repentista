## Why

Elegir rimas consultando terminaciones ortográficas produce falsos positivos. El sistema necesita familias consonantes precalculadas desde la última vocal tónica y limitadas al diccionario aprobado.

## What Changes

- Construir un catálogo versionado de familias de rima consonante.
- Indexar solo palabras aprobadas y consultar parejas por familia, categoría y rol editorial.
- Documentar una política fonética inicial y devolver resultados deterministas.
- Detectar inconsistencias entre análisis léxico y familia editorial.

## Capabilities

### New Capabilities

- `content/approved-consonant-rhyme-catalog`: indexación y consulta de familias consonantes aprobadas.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-05-model-approved-dictionary` y `qg-07-adapt-weiwei-silabacion`. No admite asonancia ni inventa palabras.
