## Why

El recuento de posiciones métricas necesita reconocer sinalefas naturales sin abrir la puerta a licencias discutibles. Esta decisión debe ser reproducible y trazable, no una intuición del LLM.

## What Changes

- Añadir un detector puro de límites vocálicos candidatos a sinalefa.
- Clasificar cada unión como aplicada, no aplicada o dudosa según una política conservadora versionada.
- Producir un trazado con palabras, vocales afectadas y motivo.
- No admitir diéresis, sinéresis buscada ni hiato artificial.

## Capabilities

### New Capabilities

- `linguistics/conservative-sinalefa-detection`: detección explicable de sinalefas naturales permitidas.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-07-adapt-weiwei-silabacion`. Alimentará el validador métrico posterior y se probará con fixtures positivos, negativos y dudosos.
