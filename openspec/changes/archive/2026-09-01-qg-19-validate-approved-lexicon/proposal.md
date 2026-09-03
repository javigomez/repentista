## Why

Una cuarteta formalmente válida puede contener objetivos no autorizados o formas desconocidas. Las palabras finales y anclas obligatorias deben pertenecer al diccionario aprobado.

## What Changes

- Añadir un único validador duro de pertenencia léxica.
- Comprobar palabra final, forma normalizada, estado aprobado y permisos para preparación/remate.
- Informar todas las ausencias o incompatibilidades en una sola ejecución.
- Mantener separada esta decisión del nivel de vocabulario blando.

## Capabilities

### New Capabilities

- `validation/approved-lexicon`: certificación de que las palabras controladas proceden del diccionario aprobado.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-05-model-approved-dictionary` y `qg-16-validate-quatrain-structure`. No consulta al LLM.
