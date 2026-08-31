# content/approved-word-dictionary Specification

## Purpose
Ofrece al dominio un vocabulario editorial cerrado, versionado y consultable para todas las palabras controladas del generador.

## Requirements

### Requirement: Entrada editorial válida
Cada entrada SHALL incluir forma, lema, tonicidad aguda o llana, categoría, nivel, estado y permisos de uso para preparación y remate.

#### Scenario: Entrada incompleta
- **WHEN** falta un campo obligatorio o la tonicidad no está soportada
- **THEN** la entrada se rechaza con errores por campo

### Requirement: Consulta por versión
El sistema SHALL consultar palabras por forma normalizada y SHALL distinguir inexistente, pendiente y aprobada.

#### Scenario: Palabra aprobada
- **WHEN** se consulta una forma presente en la versión solicitada y con estado aprobado
- **THEN** se devuelve una única entrada inmutable con esa versión

#### Scenario: Versión inexistente
- **WHEN** se solicita una versión no disponible
- **THEN** se devuelve un error explícito y no se usa otra versión silenciosamente
