## Why

La selección y edición del diccionario necesita una forma rápida de inspeccionar qué palabras aprobadas riman con una palabra concreta y por qué.

## What Changes

- Añadir un comando `inspect-rhymes` sobre el catálogo aprobado.
- Aceptar palabra y versión de diccionario, con filtros opcionales de categoría y rol.
- Devolver familia fonética, análisis tónico, candidatos y exclusiones explicadas en JSON.
- Fallar explícitamente si la palabra o versión no existe o el análisis es dudoso.

## Capabilities

### New Capabilities

- `cli/inspect-approved-rhymes`: consulta diagnóstica del catálogo de rimas consonantes.

### Modified Capabilities

Ninguna.

## Impact

Depende del diccionario, adaptador de silabación y catálogo de rimas. No genera versos ni usa un LLM.
