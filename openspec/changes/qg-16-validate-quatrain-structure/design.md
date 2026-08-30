## Context

Este es el primer bloqueo sobre un candidato ensamblado y debe ser puro, barato y exhaustivo.

## Goals / Non-Goals

**Goals:** comprobar forma, roles y consistencia con el plan.

**Non-Goals:** contar métrica, analizar fonética o puntuar calidad.

## Decisions

- El validador será un servicio de dominio sin dependencias externas y devolverá una lista de infracciones, no solo booleano.
- La comparación de finales usará tokenización y normalización compartida, conservando texto original y offsets.
- Todos los checks se ejecutarán para ofrecer un informe completo aun después del primer fallo.

## Risks / Trade-offs

- [Puntuación final confunde signos] → Definir claramente cómo se ignora puntuación terminal sin alterar la palabra.
- [Responsabilidad demasiado amplia] → Limitarlo a invariantes estructurales del agregado y plan.
