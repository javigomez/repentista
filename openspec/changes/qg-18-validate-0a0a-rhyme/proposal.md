## Why

La primera versión solo admite rima consonante entre V2 y V4. Esa relación debe certificarse fonéticamente desde la última vocal tónica, no comparando letras finales.

## What Changes

- Añadir un único validador duro del esquema `0-A-0-A`.
- Exigir que V2 y V4 pertenezcan a la misma familia consonante aprobada.
- No imponer rima a V1/V3 ni admitir asonancia como sustituto.
- Devolver terminaciones analizadas, familia, versión y motivos de fallo.

## Capabilities

### New Capabilities

- `validation/consonant-rhyme-0a0a`: validación determinista de la única relación rimante permitida.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-08-index-approved-rhyme-catalog` y `qg-16-validate-quatrain-structure`. No prepara ABAB ni asonancia.
