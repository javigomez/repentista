## Context

La documentación oficial de OpenAI describe `POST /responses`, entradas textuales, estados de respuesta y salidas JSON mediante Structured Outputs. Referencias de implementación: https://developers.openai.com/api/reference/resources/responses/methods/create y https://developers.openai.com/api/docs/guides/structured-outputs.

Verificación realizada el 2 de septiembre de 2026 contra la referencia oficial
de Responses y la referencia TypeScript: `responses.create` admite `model`,
`input`, `instructions`, `max_output_tokens` y `text.format` con un formato
`json_schema` (`name`, `schema` y configuración estricta). La respuesta expone
`id`, `model`, `status`, `incomplete_details`, `output_text` y `usage` con
`input_tokens`, `output_tokens` y `total_tokens`. El adaptador usará esos
campos y pasará la señal de abortado mediante las opciones de la llamada del
SDK. Se ha elegido `openai@7.1.0`, versión declarada por el repositorio oficial
del SDK al verificar la documentación; la dependencia se fijará exactamente en
el manifiesto durante la tarea 2.1.

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
