## Context

Los validadores ya son servicios independientes; este comando los compone para diagnóstico, no para generación.

## Goals / Non-Goals

**Goals:** offline, JSON estable e informe exhaustivo.

**Non-Goals:** reparación, scoring, evaluación blanda o aprobación.

## Decisions

- El parser creará el agregado mediante factories de dominio antes de validar; entradas estructuralmente no parseables fallan como contrato.
- Un caso de uso de diagnóstico compondrá los validadores y devolverá DTO propio; la CLI solo traduce IO.
- Se intentarán todos los validadores cuyas precondiciones existan y se marcarán los omitidos con causa.
- Tests de aceptación cubrirán stdin, fichero, stdout/stderr y códigos.

## Risks / Trade-offs

- [Un fallo temprano impide otros análisis] → Informar validadores omitidos y ejecutar los independientes.
- [Diferencias con pipeline real] → Reutilizar exactamente las mismas instancias/servicios del composition root.
