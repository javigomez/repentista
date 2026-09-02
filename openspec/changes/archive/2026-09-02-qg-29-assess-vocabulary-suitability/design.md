## Context

El diccionario aporta niveles para palabras controladas, pero el texto completo contiene formas funcionales y usos contextuales.

## Goals / Non-Goals

**Goals:** claridad contextual y diagnóstico de palabras concretas.

**Non-Goals:** análisis curricular completo o bloqueo por una nota subjetiva.

## Decisions

- Se combinarán checks deterministas de metadatos con un crítico LLM para uso contextual.
- La salida separará hallazgos de datos y de juicio, con confianza propia.
- Los ejemplos evitarán equiparar “infantil” con “fácil”.

## Risks / Trade-offs

- [Nivel de edad demasiado rígido] → Rúbrica versionada y posibilidad de brief futuro, manteniendo un default inicial.
- [Palabras polisémicas] → Evaluar el uso en su verso, no solo la entrada.
