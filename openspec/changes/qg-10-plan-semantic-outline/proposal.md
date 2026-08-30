## Why

Pedir cuatro versos de golpe mezcla demasiadas decisiones. El primer paso creativo debe convertir el brief en una idea, escena, giro y sentido final sin escribir todavía la cuarteta.

## What Changes

- Añadir un planificador de aplicación que solicite al LLM un plan semántico estructurado.
- Exigir intención final, escena, recurso, giro, riesgos y función de V1–V4.
- Prohibir versos y palabras finales en esta etapa.
- Validar el esquema de salida y registrar prompt, modelo y advertencias.

## Capabilities

### New Capabilities

- `generation/semantic-outline-planning`: creación de un plan semántico previo a rimas y versos.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-02-model-generation-brief` y `qg-04-define-llm-generation-port`. Es una capacidad creativa, no un validador.
