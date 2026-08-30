## Context

Este es el caso de uso central de aplicación. Depende de servicios de dominio y puertos; no conoce CLI, SDKs ni filesystem.

## Goals / Non-Goals

**Goals:** máquina de estados explícita, generación por ramas, puertas duras, reparación limitada y salida top-K.

**Non-Goals:** aprobación humana, exportación al juego, autosave o otros esquemas.

## Decisions

- `GenerateQuatrains` recibirá un brief y colaboradores inyectados. La máquina de estados se modelará con una unión discriminada para que cada transición requiera los artefactos previos.
- La unidad de exploración será una rama con presupuesto. V4 y V2 admiten backtracking; cada verso se escribe y valida antes de avanzar.
- Los validadores duros se ejecutarán con short-circuit de etapa, conservando todos los diagnósticos disponibles de esa etapa. Los evaluadores blandos pueden paralelizarse solo después.
- Las reparaciones generan ramas hijas con máximos por defecto. El ranker opera únicamente sobre candidatos completos puntuados.
- Reloj, IDs, LLM y cualquier IO serán puertos inyectados; los tests usarán un escenario determinista de extremo a extremo.

## Risks / Trade-offs

- [Explosión combinatoria] → Presupuestos por estado, poda temprana y métricas de supervivencia.
- [Estado difícil de depurar] → Eventos auditables y tipos discriminados por etapa.
- [Coste LLM variable] → Límite global de llamadas/tokens y salida parcial explícita.
- [Acoplamiento a orden actual] → Encapsular política de transición y versionarla; no generalizar a otras formas ahora.
