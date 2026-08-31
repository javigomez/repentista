## Why

La selección de palabras finales y las decisiones léxicas deben operar sobre un vocabulario editorial cerrado y versionado. Una lista plana no expresa tonicidad, categoría, nivel ni permisos de uso.

## What Changes

- Modelar entradas de diccionario aprobadas con lema, forma, tonicidad, categoría, nivel y usos permitidos.
- Aceptar inicialmente solo palabras agudas o llanas.
- Definir un puerto de consulta inmutable por versión.
- Rechazar entradas incompletas, duplicadas o no aprobadas.

## Capabilities

### New Capabilities

- `content/approved-word-dictionary`: modelo y consultas del diccionario editorial versionado.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-01-establish-hexagonal-foundation`. No incluye todavía carga desde archivos ni descubre palabras mediante un LLM.
