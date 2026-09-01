## Context

Esta capacidad elimina equivalencia evidente; la similitud temática y estilística pertenece a originalidad.

## Goals / Non-Goals

**Goals:** firmas explicables y deduplicación estable.

**Non-Goals:** embeddings, banco histórico o evaluación estética.

## Decisions

- La normalización será pura y versionada, preservando palabras y orden.
- Los candidatos no se borrarán: se marcarán como duplicados para conservar rendimiento y procedencia.
- El canónico será el de identidad/orden estable anterior, no el de mejor score aún inexistente.

## Risks / Trade-offs

- [Normalización excesiva une textos distintos] → Casos límite y transformaciones mínimas documentadas.
- [Variantes casi iguales sobreviven] → Resolver en el evaluador de originalidad y ranker.
