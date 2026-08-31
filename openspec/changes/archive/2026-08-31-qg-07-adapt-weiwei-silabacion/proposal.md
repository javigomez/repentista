## Why

El generador necesita sílabas y tonicidad de palabras, pero no debe propagar la API ni las decisiones de `weiwei/silabacion` al dominio. La integración debe poder sustituirse y revalidarse.

## What Changes

- Definir el puerto propio de análisis léxico requerido por el dominio.
- Implementar un adaptador sobre `weiwei/silabacion` con versión fijada.
- Traducir sílabas, índice tónico y tipo de acentuación a tipos propios.
- Añadir tests de contrato y un corpus de oro para agudas, llanas, diptongos, hiatos y errores.

## Capabilities

### New Capabilities

- `infrastructure/weiwei-silabacion-adapter`: aislamiento y traducción del análisis de palabras proporcionado por `weiwei/silabacion`.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-01-establish-hexagonal-foundation`. Introduce una dependencia MIT tras verificar versión y API al implementar; no delega en ella la métrica de verso completo.
