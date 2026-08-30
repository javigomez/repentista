## Why

El escritor trabaja mejor con una restricción local que con teoría métrica general. Antes de redactar debe recibir un presupuesto orientativo, calculado por código, para cada verso y palabra final.

## What Changes

- Calcular el objetivo de siete posiciones y el espacio orientativo previo a la última tónica.
- Incluir tonicidad, sílabas de la palabra final y advertencias sobre posibles sinalefas.
- Marcar el presupuesto como ayuda no certificadora.
- Fallar explícitamente si una palabra no puede analizarse con confianza.

## Capabilities

### New Capabilities

- `generation/verse-metric-budgeting`: cálculo de restricciones métricas orientativas para la redacción de versos.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-07-adapt-weiwei-silabacion`, `qg-09-detect-conservative-sinalefas` y la planificación de palabras y anclas.
