# domain/generation-brief Specification

## Purpose
Normaliza la intención del usuario en una solicitud de generación estable y válida para todos los casos de uso posteriores.

## Requirements

### Requirement: Brief normalizado
El sistema SHALL crear un brief inmutable desde un contexto no vacío y SHALL fijar esquema `0-A-0-A`, rima consonante y objetivo métrico de siete posiciones.

#### Scenario: Contexto válido
- **WHEN** se proporciona contexto y opciones de lote dentro de sus límites
- **THEN** se obtiene un brief normalizado con valores explícitos y valores por defecto versionados

#### Scenario: Contexto inválido
- **WHEN** el contexto queda vacío tras normalizar espacios o una opción está fuera de rango
- **THEN** se devuelve un error tipado con todos los campos inválidos sin crear el brief

### Requirement: Alcance formal cerrado
El sistema MUST rechazar cualquier solicitud de ABAB, asonancia, soneto, décima u otra métrica en esta versión.

#### Scenario: Esquema no soportado
- **WHEN** una entrada solicita una forma distinta de `0-A-0-A`
- **THEN** se devuelve un error de capacidad no soportada
