## Context

El planificador es el primer consumidor creativo del puerto LLM y debe producir un artefacto operativo, no cadena de pensamiento privada.

## Goals / Non-Goals

**Goals:** dividir el problema, validar la salida y conservar trazabilidad.

**Non-Goals:** elegir rimas, medir sílabas o escribir texto poético.

## Decisions

- Un servicio de aplicación construirá un prompt versionado por estado y solicitará un DTO pequeño mediante structured output.
- El contrato pedirá razones breves y riesgos observables, no razonamiento interno extenso.
- Un validador de salida comprobará campos, longitud y ausencia de versos antes de crear el plan de dominio.

## Risks / Trade-offs

- [Plan genérico] → Incluir ejemplos ancla y pedir escena concreta, giro y tensión.
- [El modelo escribe versos] → Rechazar salida y reintentar con diagnóstico de contrato.
