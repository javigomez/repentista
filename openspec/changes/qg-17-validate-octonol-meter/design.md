## Context

El adaptador analiza palabras y el detector analiza fronteras; este servicio compone ambas evidencias para aplicar la regla de producto.

## Goals / Non-Goals

**Goals:** resultado reproducible, escansión completa y política estricta.

**Non-Goals:** describir todas las lecturas poéticas posibles o delegar el fallo a un LLM.

## Decisions

- Se implementará como pipeline puro sobre puertos de análisis léxico inyectados: tokenizar, analizar, detectar sinalefas, localizar última tónica y contar.
- La confianza será el mínimo de sus evidencias; cualquier duda necesaria impide `VALIDO`.
- El conjunto de oro incluirá agudas, llanas, sinalefas naturales/dudosas y pronunciaciones forzadas.

## Risks / Trade-offs

- [Casos dialectales] → Política versionada y fixtures antes de añadir equivalencias.
- [Regresión al actualizar silabación] → Tests de contrato y revalidación por versión.
