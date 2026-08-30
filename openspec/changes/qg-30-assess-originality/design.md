## Context

No hay banco aprobado en este alcance; la originalidad se limita a diversidad interna del lote.

## Goals / Non-Goals

**Goals:** detectar clones semánticos y aportar relaciones al ranker.

**Non-Goals:** plagio, embeddings históricos o búsqueda externa.

## Decisions

- Se extraerán rasgos estructurados ya disponibles y se pedirá al LLM comparación solo cuando los rasgos no basten.
- El resultado será por candidato y una matriz/lista dispersa de similitudes explicadas.
- La deduplicación exacta se ejecutará antes para reducir coste cuadrático.

## Risks / Trade-offs

- [Comparaciones crecen con el lote] → Preagrupar por rasgos y evaluar solo vecinos plausibles.
- [Originalidad premia rareza] → Rúbrica exige novedad compatible con coherencia y claridad.
