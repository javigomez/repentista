## Why

La implementación actual de `inspect-rhymes` reconstruye familias consonantes desde el diccionario y el análisis silábico, aunque el diseño de QG-40 exige consultar el catálogo consonante aprobado. Esto duplica una regla lingüística crítica y permite que la CLI discrepe de la fuente de verdad editorial aun con la suite en verde.

## What Changes

- Sustituir el cálculo local de familias de `inspect-rhymes` por consultas al catálogo consonante aprobado.
- Mostrar por separado la cola fonética calculada, la familia aprobada, las candidatas y todas las exclusiones explicadas por el catálogo.
- Bloquear con un diagnóstico explícito cualquier inconsistencia entre el análisis de la palabra y la familia indexada, sin inventar ni reconstruir una familia alternativa.
- Añadir pruebas de regresión y aceptación con datos adversariales que solo pasan si el caso de uso delega realmente en el catálogo.
- Mantener la consulta offline y los códigos de salida existentes cuando sean compatibles.

## Capabilities

### New Capabilities

- `cli/inspect-approved-rhymes`: Corrige y completa el contrato de inspección iniciado en QG-40 para que la salida proceda del catálogo consonante aprobado.

### Modified Capabilities

- Ninguna. QG-40 todavía no se ha archivado en las specs principales; esta propuesta lo sucede y depende de su integración.

## Impact

- Afecta al caso de uso `src/application/inspect-approved-rhymes`, su adapter CLI, composición y tests.
- Reutiliza `content/approved-consonant-rhyme-catalog` como dependencia obligatoria y deja el diccionario y el analizador como colaboradores de validación, no como un catálogo paralelo.
- Debe implementarse después de que QG-08 y QG-40 estén integrados en la rama de trabajo.

