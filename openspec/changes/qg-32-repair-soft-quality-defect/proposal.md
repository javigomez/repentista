## Why

Una cuarteta formalmente válida puede tener un defecto blando localizado. Necesitamos reparar solo el verso o relación afectada sin perder palabras finales ni invariantes duras.

## What Changes

- Añadir un reparador para un diagnóstico blando concreto por intento.
- Conservar restricciones duras, plan, roles y partes no autorizadas.
- Exigir que toda variante reparada vuelva a pasar validación dura y evaluación afectada.
- Aplicar presupuesto máximo de intentos y registrar antes/después.

## Capabilities

### New Capabilities

- `repair/constrained-soft-quality`: reparación LLM acotada por un defecto de calidad observable.

### Modified Capabilities

Ninguna.

## Impact

Depende del escritor, el puerto LLM y los evaluadores blandos. No mezcla varios diagnósticos en una instrucción ni garantiza aceptación.
