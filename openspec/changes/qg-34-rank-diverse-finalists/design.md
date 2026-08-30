## Context

El score es escalar; la selección final necesita considerar relaciones entre candidatos.

## Goals / Non-Goals

**Goals:** top-K determinista, diverso y explicable.

**Non-Goals:** aprobación editorial o generación de sustitutos.

## Decisions

- El algoritmo será puro y greedy sobre orden estable: mejor score elegible, después candidatos que satisfacen la distancia mínima versionada.
- La originalidad y similitudes ya calculadas serán entradas; el ranker no llamará al LLM.
- Los desempates usarán score por dimensiones y finalmente ID estable.

## Risks / Trade-offs

- [Diversidad sacrifica demasiada calidad] → Umbral y penalización configurables con desglose.
- [Greedy no es óptimo global] → Adecuado al tamaño inicial; conservar contrato para cambiar algoritmo sin alterar salida semántica.
