## Context

La primera versión no introduce audio ni un analizador prosódico estadístico; combina la escansión conocida con evaluación textual.

## Goals / Non-Goals

**Goals:** separar fluidez de conteo y ofrecer diagnóstico por verso.

**Non-Goals:** síntesis de voz o patrón obligatorio único.

## Decisions

- La entrada incluirá escansión y texto, evitando pedir al LLM que vuelva a contar.
- Los perfiles `2+2+3`, `3+2+2`, `4+3`, `2+3+2` son etiquetas descriptivas, no requisitos.
- Los tests usarán pares con misma métrica y distinta fluidez editorial.

## Risks / Trade-offs

- [Evaluación sin audio limitada] → Conservar confianza y dejar comprobación fonética avanzada fuera de alcance.
- [Doble penalización con naturalidad] → Rúbrica centrada exclusivamente en pulso oral.
