## Why

Los candidatos que superan bloqueos necesitan una puntuación comparable y explicable. El score debe agregar resultados existentes, no volver a juzgar ni rescatar candidatos inválidos.

## What Changes

- Añadir un puntuador puro con rúbrica versionada y pesos configurados por producto.
- Calcular desglose y total únicamente para candidatos con todos los bloqueos superados.
- Rechazar dimensiones ausentes o de baja confianza según política explícita.
- Mantener el umbral como dato de aplicación, separado del ranking.

## Capabilities

### New Capabilities

- `scoring/versioned-quality-rubric`: agregación determinista de evaluaciones blandas en un score trazable.

### Modified Capabilities

Ninguna.

## Impact

Depende de los evaluadores `qg-23` a `qg-30`. No llama al LLM y no incluye métrica/rima como puntos compensables.
