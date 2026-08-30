## Why

El contenido está pensado para lectores de 10–12 años y necesita un bloqueo reproducible para categorías editoriales prohibidas antes de enviarse a jueces blandos.

## What Changes

- Añadir un único validador duro de seguridad editorial basado en política versionada.
- Detectar términos, temas y combinaciones explícitamente prohibidos mediante reglas y listas aprobadas.
- Devolver coincidencias localizadas y `DUDOSO` cuando una regla requiera revisión.
- Mantener el LLM fuera de la decisión certificadora.

## Capabilities

### New Capabilities

- `validation/editorial-safety`: bloqueo determinista de contenido incompatible con la política editorial inicial.

### Modified Capabilities

Ninguna.

## Impact

Depende del candidato auditable y del diccionario. No implementa moderación remota ni aprobación humana.
