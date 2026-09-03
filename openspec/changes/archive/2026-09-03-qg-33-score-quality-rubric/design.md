## Context

Las dimensiones blandas se producen por separado y pueden calibrarse; el puntuador solo agrega sus contratos.

## Goals / Non-Goals

**Goals:** cálculo puro, pesos explícitos y auditabilidad.

**Non-Goals:** llamar al LLM, decidir validez o seleccionar top-K.

## Decisions

- `QualityRubric` será un value object versionado con dimensiones, pesos, escala y política de confianza.
- La primera rúbrica seguirá la documentación actual de calidad blanda y podrá recalibrarse sin cambiar evaluadores.
- Se usará aritmética y redondeo definidos con tests de borde.

## Risks / Trade-offs

- [Pesos aparentan objetividad literaria] → Exponer desglose y versión; tratarlos como política editorial calibrable.
- [Cambiar pesos altera ranking] → Conservar versión en cada candidato y no recomputar silenciosamente.
