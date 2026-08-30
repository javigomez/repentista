## Context

La CLI es el único adaptador de entrada actual y el entrypoint de `package.json`; debe ser estable para scripts y personas.

## Goals / Non-Goals

**Goals:** contrato JSON, códigos de salida, selección de adapter y wiring explícito.

**Non-Goals:** UI interactiva, streaming de versos o aprobación editorial.

## Decisions

- `src/infrastructure/cli` contendrá parsing y renderizado; el composition root construirá diccionario, adapter LLM y `GenerateQuatrains`.
- stdout se reservará para el documento JSON final; progreso y diagnósticos irán a stderr.
- El contexto podrá venir de argumento o fichero, nunca de ambos de forma ambigua. La validación final la hará `GenerationBrief`.
- Los códigos distinguirán éxito, parcial/sin finalistas, entrada inválida y fallo operativo no confiable.
- Tests de aceptación ejecutarán el entrypoint con adapters falsos y snapshots JSON estables.

## Risks / Trade-offs

- [JSON demasiado grande por trazas] → Ofrecer nivel de detalle, manteniendo siempre versiones y diagnósticos esenciales.
- [Credenciales en argumentos] → Solo variables/config segura; nunca flags que se ecoen.
- [CLI conoce proveedores] → Solo enum de composición, sin tipos de SDK.
