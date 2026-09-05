## Why

La ventaja del sistema incremental solo existe si un caso de uso controla los estados y nunca pide al LLM una cuarteta completa. La aplicación debe ser dueña del flujo, los reintentos y el descarte.

## What Changes

- Añadir el caso de uso `GenerateQuatrains` como orquestador de aplicación.
- Ejecutar estados explícitos desde brief hasta lista de finalistas, escribiendo y validando un verso cada vez.
- Aplicar bloqueos antes de evaluaciones blandas, reparación limitada, scoring y ranking.
- Generar lotes configurables, conservar diagnósticos de rechazados en el resultado de ejecución y devolver solo finalistas en la lista principal.

## Capabilities

### New Capabilities

- `application/incremental-quatrain-generation`: flujo completo y auditable de generación `0-A-0-A` por estados.

### Modified Capabilities

Ninguna.

## Impact

Integra las propuestas `qg-02` a `qg-34` mediante puertos. No contiene SDKs, CLI, aprobación, exportación ni persistencia editorial.
