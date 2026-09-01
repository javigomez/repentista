## Why

Cada verso debe tener exactamente siete posiciones métricas hasta la última sílaba tónica. El LLM y un silabeador de palabras no pueden certificar por sí solos esta regla de producto.

## What Changes

- Añadir un único validador duro de octoñol para un verso.
- Analizar palabras, última tónica y sinalefas naturales con política conservadora.
- Aceptar inicialmente finales agudos y llanos y exigir exactamente siete posiciones.
- Devolver escansión completa, confianza y estado `DUDOSO` cuando cuadrar dependa de una decisión discutible.

## Capabilities

### New Capabilities

- `validation/octonol-meter`: validación explicable de siete posiciones hasta la última tónica.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-07-adapt-weiwei-silabacion` y `qg-09-detect-conservative-sinalefas`. Tendrá un conjunto de oro versionado.
