## Context

La aplicación necesita explorar varias redacciones por slot y podarlas mediante validadores deterministas.

## Goals / Non-Goals

**Goals:** escritura local, diversidad controlada y respuestas estructuradas.

**Non-Goals:** certificar, reparar o elegir la mejor variante.

## Decisions

- El escritor será un servicio de aplicación sobre el puerto LLM, con un prompt distinto por rol pero un contrato de salida común.
- Las variantes se pedirán independientes, no como revisiones acumulativas, para mejorar diversidad.
- Se comprobarán restricciones sintácticas simples como final obligatorio antes de crear borradores; métrica y rima quedan en validadores.

## Risks / Trade-offs

- [Muchas variantes elevan coste] → Cantidad por brief y telemetría de rendimiento por etapa.
- [Todas comparten la misma fórmula] → Semillas de estructura y parámetros de diversidad en la entrada del escritor.
