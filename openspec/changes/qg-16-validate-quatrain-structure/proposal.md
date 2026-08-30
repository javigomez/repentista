## Why

Antes de comprobar métrica o calidad, un candidato debe demostrar que contiene exactamente cuatro versos, roles ordenados y las palabras finales planificadas en sus posiciones.

## What Changes

- Añadir un único validador duro de estructura de cuarteta.
- Exigir V1 presentación, V2 preparación, V3 giro/tensión y V4 remate.
- Exigir texto no vacío, esquema `0-A-0-A` y finales V2/V4 iguales a los planificados.
- Devolver `VALIDO`, `DUDOSO` o `INVALIDO` con infracciones localizadas.

## Capabilities

### New Capabilities

- `validation/quatrain-structure`: certificación determinista de la estructura y del plan materializado.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-03-model-auditable-candidate` y `qg-15-generate-single-verse-variants`. No comprueba métrica, rima ni calidad blanda.
