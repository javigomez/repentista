## Context

El catálogo proporciona familias; este validador aplica la única relación permitida a los versos del candidato.

## Goals / Non-Goals

**Goals:** consonancia determinista y diagnóstico fonético.

**Non-Goals:** ABAB, asonancia o valoración estética de la pareja.

## Decisions

- El validador usará las palabras finales extraídas por estructura y consultará sus análisis/familias por versión.
- La igualdad se hará sobre value objects fonéticos, nunca sufijos ortográficos.
- Una palabra sin análisis confiable produce `DUDOSO`, no comparación aproximada.

## Risks / Trade-offs

- [Familia editorial contradice análisis] → Devolver inconsistencia de datos y bloquear.
- [Coincidencias accidentales en V1/V3] → Informarlas como metadato futuro sin añadir reglas.
