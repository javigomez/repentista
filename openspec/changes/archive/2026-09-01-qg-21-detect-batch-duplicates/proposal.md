## Why

Generar por lotes puede producir la misma cuarteta o variaciones triviales, falseando el rendimiento y ocupando plazas del top-K. La deduplicación debe ocurrir antes del scoring.

## What Changes

- Añadir un único comprobador determinista de duplicados dentro del lote.
- Normalizar texto, palabras finales, estructura y plan para detectar igualdad exacta o equivalencia configurada.
- Elegir un representante estable y marcar los restantes con su candidato canónico.
- No comparar todavía contra un banco histórico externo.

## Capabilities

### New Capabilities

- `validation/batch-duplicate-detection`: eliminación auditable de duplicados dentro de un lote de candidatos.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-03-model-auditable-candidate`. No sustituye la evaluación blanda de originalidad.
