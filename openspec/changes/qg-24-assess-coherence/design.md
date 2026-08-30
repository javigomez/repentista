## Context

Las anclas previenen parte del problema, pero la evaluación debe observar el texto final completo.

## Goals / Non-Goals

**Goals:** mapa narrativo verificable y señal separada.

**Non-Goals:** evaluar calidad del remate o reescribir transiciones.

## Decisions

- El prompt recibirá roles y plan junto al texto, para comparar intención y realización.
- El DTO exigirá transiciones V1→V2, V2→V3 y V3→V4, evitando una nota sin explicación.
- Los tests ancla incluirán versos individualmente válidos pero mutuamente inconexos.

## Risks / Trade-offs

- [El modelo sobrevalora su propia interpretación] → Pedir referentes explícitos y marcar baja confianza cuando deba inventarlos.
- [Solapamiento con remate] → Limitarse a conexión, no sorpresa o resolución.
