## Why

Una suite funcional puede permanecer verde aunque una capa consumidora duplique el algoritmo de familias consonantes y se salte el catálogo aprobado. Se necesita una frontera de arquitectura ejecutable que convierta esa fuente única de verdad en una restricción verificable.

## What Changes

- Definir el catálogo consonante aprobado como único propietario de la extracción, construcción y pertenencia a familias consonantes.
- Añadir una familia de tests de arquitectura que prohíba implementaciones equivalentes en aplicación, CLI, validadores y otras capas consumidoras.
- Verificar las direcciones de importación permitidas y exigir delegación explícita en el catálogo para consultas de familias.
- Incorporar fixtures adversariales y una comprobación estructural mantenible, con diagnósticos que indiquen el fichero y la regla infringida.
- Documentar cómo registrar excepciones temporales; por defecto no habrá excepciones silenciosas.

## Capabilities

### New Capabilities

- `architecture/approved-rhyme-catalog-boundary`: Reglas ejecutables que preservan el catálogo consonante aprobado como fuente única de verdad.

### Modified Capabilities

- Ninguna.

## Impact

- Afecta a `src/testing/architecture-rules.ts`, a los tests de arquitectura y a cualquier módulo que consulte o calcule rimas consonantes.
- Puede descubrir deuda existente y requerir que QG-41 se integre antes de que la nueva regla quede verde.
- No cambia el contrato público del catálogo ni añade dependencias de producción.

