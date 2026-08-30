## Why

Las tareas creativas necesitan un LLM, pero el dominio y la aplicación no deben conocer OpenAI, OpenCode ni formatos propios de sus SDK. Un puerto estable permite probar cada etapa con respuestas deterministas.

## What Changes

- Definir un puerto de salida para operaciones LLM estructuradas y versionadas.
- Modelar petición, esquema de respuesta, uso, procedencia, timeout y errores mediante tipos propios.
- Exigir salida validada contra esquema y prohibir que una respuesta del modelo certifique reglas duras.
- Proporcionar un doble determinista reutilizable en tests.

## Capabilities

### New Capabilities

- `ports/structured-llm-generation`: contrato independiente del proveedor para tareas creativas y críticas blandas.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-01-establish-hexagonal-foundation` y `qg-03-model-auditable-candidate`. Los adaptadores de OpenAI y OpenCode se especifican aparte.
