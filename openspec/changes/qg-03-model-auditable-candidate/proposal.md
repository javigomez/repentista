## Why

Una cuarteta no puede representarse como cuatro strings: el pipeline necesita conservar plan, versos, estados, diagnósticos, versiones y motivos de descarte sin perder trazabilidad.

## What Changes

- Introducir el agregado `QuatrainCandidate` con cuatro roles de verso y esquema fijo.
- Modelar transiciones auditables desde generado hasta finalista o rechazado.
- Conservar procedencia de prompts, modelo, validadores, reparaciones y score.
- Impedir transiciones inválidas mediante resultados tipados.

## Capabilities

### New Capabilities

- `domain/auditable-quatrain-candidate`: agregado y ciclo de vida auditable de un candidato.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-02-model-generation-brief`. Proporciona el modelo compartido por validadores, evaluadores y orquestación; no añade persistencia ni aprobación editorial.
