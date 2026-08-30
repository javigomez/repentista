## Context

La documentación oficial de OpenAI describe `POST /responses`, entradas textuales, estados de respuesta y salidas JSON mediante Structured Outputs. Referencias de implementación: https://developers.openai.com/api/reference/resources/responses/methods/create y https://developers.openai.com/api/docs/guides/structured-outputs.

## Goals / Non-Goals

**Goals:** adapter delgado, schema-first, abortable y trazable.

**Non-Goals:** elegir el “mejor” modelo automáticamente, usar herramientas alojadas o mantener conversación como estado de dominio.

## Decisions

- Solo infraestructura importará el SDK oficial. El cliente se inyectará para tests y se configurará en el composition root.
- Cada operación usará Responses con formato JSON Schema cuando el modelo configurado lo soporte. La validación local del DTO seguirá siendo obligatoria.
- Se preferirán llamadas sin estado compartido entre candidatos para reproducibilidad; cualquier identificador remoto se guardará solo como procedencia.
- Timeouts y cancelación se propagarán mediante señal abortable. Los errores del SDK se mapearán a la taxonomía del puerto.
- Los tests normales simularán cliente; una suite de contrato opt-in, sin formar parte del camino offline, verificará integración real cuando haya credenciales.

## Risks / Trade-offs

- [API o SDK evolucionan] → Versión fijada, documentación actual verificada al implementar y tests de contrato.
- [Modelo no soporta esquema solicitado] → Fallo de configuración explícito, sin fallback a texto libre silencioso.
- [Coste y datos enviados] → Telemetría de uso y prompts mínimos por estado.
