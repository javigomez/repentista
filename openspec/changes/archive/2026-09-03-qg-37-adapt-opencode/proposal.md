## Why

El generador también debe poder ejecutar las mismas tareas estructuradas a través de OpenCode sin acoplar la aplicación a sesiones, servidor o SDK de ese producto.

## What Changes

- Añadir un adaptador de infraestructura del puerto LLM para OpenCode.
- Preferir su cliente programático y servidor headless frente a raspar salida de terminal.
- Gestionar sesión, prompt, selección de modelo, timeout y traducción de errores.
- Validar localmente cada respuesta contra el esquema del puerto y añadir tests con servidor o cliente falso.

## Capabilities

### New Capabilities

- `infrastructure/opencode-llm-adapter`: implementación OpenCode del puerto de generación estructurada.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-04-define-llm-generation-port`. La selección entre adaptadores ocurre en el composition root, nunca en dominio o aplicación.
