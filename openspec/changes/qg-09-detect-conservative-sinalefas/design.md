## Context

La separación silábica es léxica; las sinalefas aparecen en fronteras del verso y pertenecen a una política de producto más estricta que la poesía general.

## Goals / Non-Goals

**Goals:** decisión pura, trazable y conservadora por frontera.

**Non-Goals:** certificar el total del verso o modelar todas las escuelas métricas.

## Decisions

- El detector recibirá tokens con análisis de palabra y signos de puntuación ya preservados.
- Las reglas se evaluarán en orden explícito y devolverán evidencia, evitando una simple resta numérica.
- Cualquier regla no cubierta produce `DUDOSA`; el validador métrico decidirá después que un verso dependiente de duda no es válido.

## Risks / Trade-offs

- [Política demasiado estricta] → Mantener fixtures editoriales y versionar cualquier relajación futura.
- [Tokenización pierde puntuación] → Exigir tokens con offsets y añadir casos de comas, haches y conjunciones.
