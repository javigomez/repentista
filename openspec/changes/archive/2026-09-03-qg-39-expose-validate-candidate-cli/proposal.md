## Why

Los autores y desarrolladores necesitan ejecutar las reglas duras sobre un candidato existente sin iniciar generación ni consumir un LLM.

## What Changes

- Añadir un comando `validate-candidate` que reciba JSON por fichero o stdin.
- Ejecutar estructura, métrica, rima, léxico, ambigüedad y seguridad como servicios independientes.
- Devolver un informe JSON por validador, con escansiones y motivos, y un código no satisfactorio ante inválido o dudoso.
- Prohibir llamadas a proveedores LLM.

## Capabilities

### New Capabilities

- `cli/validate-candidate`: diagnóstico componible de las reglas duras de una cuarteta.

### Modified Capabilities

Ninguna.

## Impact

Depende de los validadores `qg-16` a `qg-22`. Es un adaptador de entrada y no reimplementa reglas.
