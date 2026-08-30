## Context

El generador no llega aún a aprobación humana, por lo que una política mínima debe impedir que el top-K incluya contenido claramente fuera de alcance.

## Goals / Non-Goals

**Goals:** reglas versionadas, localización de fallos y comportamiento conservador.

**Non-Goals:** moderación universal, cumplimiento legal exhaustivo o clasificación remota.

## Decisions

- La política será contenido versionado separado del código, pero sus matchers serán deterministas y testeables.
- Se usarán reglas exactas y contextuales acotadas; no se inferirán intenciones mediante un LLM.
- Los casos dudosos quedan bloqueados del flujo automático y visibles en diagnóstico.

## Risks / Trade-offs

- [Falsos positivos] → Fixtures de polisemia y severidad explícita por regla.
- [Cobertura limitada] → Declarar alcance y evolucionar la política con revisión editorial.
