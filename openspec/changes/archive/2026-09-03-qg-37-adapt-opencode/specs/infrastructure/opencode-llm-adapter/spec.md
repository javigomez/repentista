## Purpose

Implementa el mismo puerto LLM mediante la interfaz programática de OpenCode, aislando sesiones, servidor y selección de modelo en infraestructura.

## ADDED Requirements

### Requirement: Ejecución programática
El adaptador SHALL crear o reutilizar una sesión controlada, enviar el prompt mediante cliente/SDK y devolver la respuesta al contrato común sin raspar una TUI.

#### Scenario: Operación completada
- **WHEN** el servidor OpenCode acepta la sesión y completa el prompt
- **THEN** el adaptador extrae la respuesta, la valida contra el esquema y devuelve procedencia normalizada

#### Scenario: Servidor no disponible
- **WHEN** no puede conectarse al endpoint configurado
- **THEN** devuelve un error de indisponibilidad tipado sin intentar interpretar salida de terminal

### Requirement: Aislamiento de sesiones
El adaptador SHALL impedir que contexto de una rama contamine otra salvo que la operación lo solicite explícitamente.

#### Scenario: Dos candidatos independientes
- **WHEN** se ejecutan prompts para ramas distintas
- **THEN** usan sesiones o contextos aislados y producen trazas con sus IDs respectivos

### Requirement: Salida validada y cancelable
El adaptador SHALL validar localmente el esquema, respetar timeout/cancelación y normalizar errores del servidor o modelo.

#### Scenario: Texto no conforme
- **WHEN** OpenCode devuelve contenido que no puede convertirse al DTO solicitado
- **THEN** la operación falla como respuesta estructurada inválida
