## Why

El contexto libre que recibe el usuario debe convertirse en una entrada de dominio explícita antes de planificar. Un brief normalizado evita que cada etapa interprete de manera distinta el tema, el tono o los límites formales.

## What Changes

- Definir un `GenerationBrief` inmutable para contexto, tono y opciones de lote.
- Fijar `0-A-0-A`, rima consonante y siete posiciones hasta la última tónica como valores no configurables de esta versión.
- Rechazar contexto vacío y opciones fuera de rango con errores tipados.

## Capabilities

### New Capabilities

- `domain/generation-brief`: contrato y normalización de la solicitud de generación.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-01-establish-hexagonal-foundation`. Será la entrada de todos los casos de uso y de la CLI; no llama al LLM ni escribe versos.
