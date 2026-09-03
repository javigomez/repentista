## Why

Un verso puede cumplir las reglas y sonar como una frase que nadie diría. La naturalidad necesita una evaluación blanda separada para observarla y calibrarla sin alterar la validez formal.

## What Changes

- Añadir un único evaluador de naturalidad para candidatos técnicamente válidos.
- Usar una rúbrica y ejemplos versionados mediante el puerto LLM.
- Devolver nota, evidencias textuales, confianza y procedencia.
- Prohibir que su nota cambie un resultado duro.

## Capabilities

### New Capabilities

- `quality/naturalness-assessment`: evaluación trazable de si los versos suenan naturales en castellano.

### Modified Capabilities

Ninguna.

## Impact

Depende del puerto LLM y de los validadores duros. Su resultado alimentará scoring y reparación.
