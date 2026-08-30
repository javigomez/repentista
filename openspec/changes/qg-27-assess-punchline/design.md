## Context

Remate y humor están correlacionados, pero mezclarlos impide saber qué mejorar.

## Goals / Non-Goals

**Goals:** evaluar preparación y resolución de V4.

**Non-Goals:** valorar seguridad, rima o comicidad.

## Decisions

- El DTO obligará a resumir expectativa y resolución antes de dar nota.
- El prompt no recibirá la evaluación de humor para evitar arrastre.
- Los anchors de calidad incluirán cierres graciosos sin preparación y remates sólidos no cómicos.

## Risks / Trade-offs

- [El modelo inventa una expectativa] → Exigir citas de V1–V3 y bajar confianza si no puede localizarlas.
- [Solapamiento con coherencia] → Coherencia mide conexión; remate mide función final.
