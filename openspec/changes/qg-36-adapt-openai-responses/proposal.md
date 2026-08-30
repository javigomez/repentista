## Why

El puerto LLM necesita una implementación para OpenAI sin filtrar tipos del proveedor a la aplicación. La integración debe producir objetos estructurados y trazabilidad uniforme.

## What Changes

- Añadir un adaptador de infraestructura para el puerto LLM mediante la Responses API de OpenAI.
- Usar salidas estructuradas con esquema, límites de tokens, timeout y abortado.
- Traducir estados incompletos, rechazos, errores, uso y metadatos a tipos propios.
- Mantener modelo y credenciales en configuración externa e incluir tests con cliente simulado y contratos opt-in.

## Capabilities

### New Capabilities

- `infrastructure/openai-responses-adapter`: implementación OpenAI del puerto de generación estructurada.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-04-define-llm-generation-port`. Introducirá el SDK oficial solo en infraestructura; la versión y API se verificarán al implementar.
