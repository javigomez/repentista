## Purpose

Permite solicitar trabajo creativo estructurado a distintos proveedores sin acoplar los casos de uso a SDKs, transporte o modelos concretos.

## ADDED Requirements

### Requirement: Generación contra esquema
El sistema SHALL aceptar una operación, prompt versionado, entrada, esquema de salida y límites, y SHALL devolver únicamente datos que hayan superado la validación local del esquema.

#### Scenario: Respuesta estructurada válida
- **WHEN** el adaptador devuelve un objeto conforme al esquema solicitado
- **THEN** el puerto retorna los datos junto con proveedor, modelo, prompt, uso y duración normalizados

#### Scenario: Respuesta inválida
- **WHEN** el proveedor devuelve texto u objeto que no cumple el esquema
- **THEN** el puerto devuelve un error tipado y nunca entrega datos parciales como éxito

### Requirement: Errores independientes del proveedor
El sistema SHALL normalizar timeout, cancelación, autenticación, límite, indisponibilidad y rechazo de contenido.

#### Scenario: Timeout
- **WHEN** vence el límite de una operación
- **THEN** se devuelve un error de timeout reintentable sin exponer tipos del SDK
