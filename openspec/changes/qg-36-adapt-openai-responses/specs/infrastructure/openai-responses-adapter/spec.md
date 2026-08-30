## Purpose

Implementa el puerto de generación estructurada mediante OpenAI Responses sin exponer su SDK o modelo de errores fuera de infraestructura.

## ADDED Requirements

### Requirement: Petición estructurada a OpenAI
El adaptador SHALL traducir prompt, entrada, modelo, límites y esquema del puerto a una petición Responses con salida estructurada, y SHALL validar de nuevo el resultado localmente.

#### Scenario: Respuesta completada y válida
- **WHEN** OpenAI completa una respuesta conforme al esquema
- **THEN** el adaptador devuelve datos y procedencia normalizados sin tipos del SDK

#### Scenario: Respuesta incompleta o inválida
- **WHEN** el estado no es completado o el contenido no satisface el esquema local
- **THEN** devuelve un error tipado con estado y detalles seguros

### Requirement: Configuración y secretos externos
El adaptador SHALL recibir credencial, modelo y políticas de timeout desde configuración de infraestructura y MUST NOT incluir secretos en logs o errores.

#### Scenario: Credencial ausente
- **WHEN** se selecciona OpenAI sin configuración de autenticación
- **THEN** falla antes de enviar una petición y ofrece un diagnóstico sin revelar valores sensibles

### Requirement: Contratos de error y uso
El adaptador SHALL normalizar autenticación, rate limit, timeout, cancelación, rechazo y error remoto, y SHALL registrar uso disponible.

#### Scenario: Rate limit
- **WHEN** la API devuelve limitación temporal
- **THEN** el puerto recibe un error reintentable con metadatos no sensibles
