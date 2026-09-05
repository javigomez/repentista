## Context

El análisis de palabra aporta tonicidad; el catálogo añade decisiones fonéticas y editoriales propias del producto.

## Goals / Non-Goals

**Goals:** lookup rápido, determinista y explicable de rimas consonantes.

**Non-Goals:** asonancia, generación morfológica o inferencia desde corpus.

## Decisions

- La familia será un value object de cola fonética normalizada. Las equivalencias dialectales se declararán en una política versionada, no como reemplazos dispersos.
- El índice se construirá por snapshot de diccionario y validará las relaciones editoriales declaradas.
- Los filtros serán predicados de dominio sobre categoría y permisos de rol; el LLM nunca amplía los resultados.

## Risks / Trade-offs

- [Fonética simplificada produce falsos grupos] → Conjunto de oro y lista editorial de excepciones versionadas.
- [Familias pequeñas reducen creatividad] → Medir cobertura y ampliar el diccionario, no relajar consonancia.
