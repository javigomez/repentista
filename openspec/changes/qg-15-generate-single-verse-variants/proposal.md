## Why

El LLM no debe resolver la cuarteta completa en una llamada. Necesitamos generar variantes de un único verso con un rol y restricciones fijas para validar y reparar cada pieza antes de avanzar.

## What Changes

- Añadir un escritor de variantes para exactamente un rol de verso por llamada.
- Recibir anclas, palabra final opcional, presupuesto métrico y restricciones que no puede modificar.
- Devolver un lote estructurado de variantes independientes, sin afirmar su validez.
- Limitar reintentos y registrar procedencia y errores de contrato.

## Capabilities

### New Capabilities

- `generation/single-verse-variant-writing`: redacción LLM de variantes restringidas de un solo verso.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-04-define-llm-generation-port`, `qg-13-plan-verse-semantic-anchors` y `qg-14-calculate-metric-budgets`.
