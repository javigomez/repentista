## Why

Después de eliminar duplicados exactos, todavía pueden sobrevivir fórmulas, imágenes o giros casi idénticos. La originalidad relativa al lote debe medirse para favorecer variedad.

## What Changes

- Añadir un único evaluador de originalidad dentro del lote actual.
- Comparar parejas de rima, anclas, estructuras, personajes y mecanismos de remate.
- Devolver nota, candidatos similares y rasgos compartidos.
- No consultar todavía un banco histórico ni convertir similitud en bloqueo duro.

## Capabilities

### New Capabilities

- `quality/batch-originality-assessment`: evaluación blanda de novedad y variedad entre candidatos del lote.

### Modified Capabilities

Ninguna.

## Impact

Depende del candidato auditable, la deduplicación y el puerto LLM. Alimentará el ranking diverso.
