## Why

Una pareja elegida no es suficiente si varias palabras aprobadas podrían ocupar razonablemente el mismo hueco. La ambigüedad debe detectarse antes de considerar finalista una cuarteta.

## What Changes

- Añadir un único validador duro que enumere alternativas del diccionario cerrado.
- Filtrar por familia, categoría y restricciones explícitas del plan.
- Declarar `INVALIDO` ante alternativas aprobadas y `DUDOSO` cuando la plausibilidad semántica no pueda decidirse de forma determinista.
- Conservar la lista completa de alternativas y sus razones.

## Capabilities

### New Capabilities

- `validation/answer-ambiguity`: detección conservadora y explicable de respuestas alternativas.

### Modified Capabilities

Ninguna.

## Impact

Depende del diccionario, catálogo de rimas y validador léxico. No permite que una opinión del LLM convierta un caso dudoso en válido.
