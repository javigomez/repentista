## Context

Los datos se versionarán en el repositorio, pero el dominio solo conoce un puerto de consulta.

## Goals / Non-Goals

**Goals:** parsing atómico, diagnóstico legible y fixtures revisables.

**Non-Goals:** editar el diccionario desde CLI o migrar automáticamente versiones antiguas.

## Decisions

- El adaptador leerá y validará un DTO de infraestructura antes de invocar factories de dominio. Las rutas se resolverán en el composition root.
- Un manifest relacionará versión lógica y fichero; la selección será explícita.
- Los tests usarán un puerto de lectura de texto o directorios temporales controlados, no rutas globales.

## Risks / Trade-offs

- [Dos capas de validación] → Mantener el esquema externo para forma y factories de dominio para invariantes.
- [Cambios de contrato] → Versionar formato y añadir fixtures de compatibilidad/rechazo.
