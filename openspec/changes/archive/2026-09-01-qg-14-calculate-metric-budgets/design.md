## Context

Sumar sílabas de palabras aisladas no basta por sinalefas; el presupuesto solo reduce el espacio de búsqueda.

## Goals / Non-Goals

**Goals:** ayudas concretas y trazables para el prompt de un verso.

**Non-Goals:** predecir la escansión completa o aprobar un verso.

## Decisions

- Un servicio puro derivará presupuesto desde objetivo formal y `WordAnalysis`.
- El resultado distinguirá datos exactos de heurísticas y llevará advertencias que el prompt debe preservar.
- La única prueba de validez seguirá siendo ejecutar el validador sobre el texto completo.

## Risks / Trade-offs

- [El modelo interpreta el margen como garantía] → Etiquetar explícitamente como orientación y revalidar siempre.
- [Final desconocido en V1/V3] → Ofrecer rangos y perfiles, no cifras falsas.
