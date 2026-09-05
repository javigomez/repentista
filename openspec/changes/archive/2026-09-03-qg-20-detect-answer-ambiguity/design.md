## Context

La unicidad absoluta del lenguaje es difícil; la política inicial prefiere bloquear la incertidumbre antes que confiar en un juez opaco.

## Goals / Non-Goals

**Goals:** enumeración reproducible y salida conservadora.

**Non-Goals:** demostrar unicidad sobre todo el castellano o permitir que el LLM certifique el descarte.

## Decisions

- La búsqueda partirá del catálogo completo de la familia y aplicará restricciones tipadas del slot.
- Metadatos editoriales podrán declarar exclusiones contextuales versionadas; en su ausencia, múltiples resultados producen duda o invalidez.
- El informe distinguirá alternativas aceptadas, descartadas por regla y pendientes.

## Risks / Trade-offs

- [Muchos `DUDOSO`] → Mejorar metadatos y reescribir prompts/versos, no relajar silenciosamente.
- [Diccionario pequeño oculta alternativas externas] → El alcance de unicidad se declarará relativo a la versión aprobada.
