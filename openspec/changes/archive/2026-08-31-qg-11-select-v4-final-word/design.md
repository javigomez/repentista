## Context

La creatividad decide entre opciones; el catálogo decide qué opciones existen y están autorizadas.

## Goals / Non-Goals

**Goals:** priorizar significado del final y conservar alternativas.

**Non-Goals:** redactar V4 o ampliar el diccionario.

## Decisions

- El servicio consultará diccionario y catálogo antes del LLM para descartar palabras sin pareja posible.
- La respuesta del modelo será una referencia estable a una candidata, no texto libre.
- Se conservará el ranking corto para permitir backtracking del orquestador si la pareja o escritura falla.

## Risks / Trade-offs

- [Pre-filtrar limita una gran idea] → Ampliar contenido editorial en otro flujo, no saltarse el banco aprobado.
- [Razón plausible pero irrelevante] → Validar que cite elementos del plan y marcar baja confianza.
