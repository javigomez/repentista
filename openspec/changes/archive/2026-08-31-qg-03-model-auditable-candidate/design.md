## Context

El pipeline es incremental y probabilístico en creación, pero sus decisiones deben poder reproducirse y explicarse.

## Goals / Non-Goals

**Goals:** proteger invariantes, conservar historial y ofrecer snapshots serializables.

**Non-Goals:** persistir en disco, aprobar editorialmente o modelar el juego.

## Decisions

- El agregado será la frontera de consistencia para versos y estados. Los diagnósticos se añadirán como eventos inmutables y el estado actual se derivará o actualizará mediante métodos de dominio.
- Los resultados usarán un vocabulario común `VALIDO | DUDOSO | INVALIDO`; cada validador conservará además su evidencia específica.
- Los identificadores, timestamps y versiones se recibirán por puertos o factories inyectables para tests deterministas.

## Risks / Trade-offs

- [El agregado puede crecer demasiado] → Conservar referencias a artefactos tipados y evitar lógica de IO.
- [Eventos incompatibles al evolucionar] → Versionar snapshots y añadir tests de compatibilidad antes de cambiar contratos.
