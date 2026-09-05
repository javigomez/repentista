## Context

El catálogo es un servicio de contenido puro; la CLI permite comprobarlo durante edición y depuración.

## Goals / Non-Goals

**Goals:** consulta transparente, filtros y exclusiones.

**Non-Goals:** editar el diccionario, sugerir palabras externas o generar versos.

## Decisions

- Un caso de uso de consulta recibirá palabra/versión/filtros y devolverá DTO; el adapter CLI compartirá parsing/renderizado con los otros comandos.
- La salida incluirá tanto candidatas como razones de exclusión para revelar problemas de categoría, rol o estado.
- Los resultados se ordenarán de forma estable por calidad editorial y clave normalizada definida en el catálogo.

## Risks / Trade-offs

- [Demasiado detalle por defecto] → JSON estructurado con secciones claras; un flag futuro podrá reducirlo sin cambiar el caso de uso.
- [Confusión entre familia calculada y aprobada] → Mostrar ambas y bloquear si son inconsistentes.
