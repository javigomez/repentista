## Context

V4 ya está fijada; la búsqueda de V2 es una consulta cerrada seguida de una elección semántica.

## Goals / Non-Goals

**Goals:** consonancia garantizada por datos y preparación semántica priorizada por LLM.

**Non-Goals:** escribir V2 o aceptar candidatos externos.

## Decisions

- Los filtros duros se ejecutarán antes del LLM; el modelo solo ordenará IDs de candidatas.
- El resultado conservará candidatas descartadas y motivos para explicar por qué una familia se agota.
- El orquestador podrá hacer backtracking a la siguiente V4, pero este selector no controla ese flujo.

## Risks / Trade-offs

- [Pareja válida pero propensa a ripio] → Conservar advertencia semántica y someter versos al detector específico.
- [Abuso de infinitivos/participios] → Política editorial explícita y fixtures de pares rechazados.
