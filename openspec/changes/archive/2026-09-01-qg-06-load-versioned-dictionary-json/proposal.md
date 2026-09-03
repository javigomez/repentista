## Why

El diccionario del dominio necesita una fuente editable y versionable sin acoplarse al filesystem. Un adaptador JSON permite mantener fixtures legibles y fallar de forma explicable ante datos corruptos.

## What Changes

- Añadir un adaptador de infraestructura que cargue una versión concreta del diccionario desde JSON.
- Validar el contrato completo antes de construir entradas de dominio.
- Informar ruta lógica, versión y errores por entrada sin aceptar contenido parcial silenciosamente.

## Capabilities

### New Capabilities

- `infrastructure/versioned-dictionary-json`: carga segura del diccionario aprobado desde archivos JSON.

### Modified Capabilities

Ninguna.

## Impact

Depende de `qg-05-model-approved-dictionary`. Afectará a `src/infrastructure/content` y a fixtures versionados; no cambia las reglas del diccionario.
