## Context

El diccionario es simultáneamente un recurso editorial y una frontera determinista para selección y validación.

## Goals / Non-Goals

**Goals:** tipos de dominio claros, consultas puras y versionado explícito.

**Non-Goals:** cargar archivos, analizar sílabas o enriquecer palabras automáticamente.

## Decisions

- `ApprovedWord` será una entidad identificada por forma normalizada y versión; sus rasgos lingüísticos se expresarán con value objects y uniones cerradas.
- El puerto de repositorio devolverá snapshots inmutables. No habrá fallback implícito a “latest”.
- La semilla documental se convertirá en fixtures pendientes y aprobados explícitos; ningún ejemplo entra aprobado sin revisión.

## Risks / Trade-offs

- [Datos editoriales incompletos bloquean generación] → Exponer diagnósticos de cobertura y mantener una semilla mínima bien revisada.
- [Normalización confunde formas distintas] → Conservar forma visible y clave normalizada por separado.
