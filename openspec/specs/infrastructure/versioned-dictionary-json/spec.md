# infrastructure/versioned-dictionary-json Specification

## Purpose
Carga snapshots JSON del diccionario aprobado y los traduce al puerto de contenido sin contaminar el dominio con filesystem o parsing.

## Requirements

### Requirement: Carga atómica
El sistema SHALL validar metadatos y todas las entradas de un fichero antes de publicar el snapshot al repositorio.

#### Scenario: Fichero válido
- **WHEN** el JSON cumple el contrato y todas sus entradas son válidas
- **THEN** el adaptador expone el snapshot con la versión declarada

#### Scenario: Una entrada inválida
- **WHEN** cualquier entrada incumple el contrato
- **THEN** falla la carga completa e informa índice, campo y motivo sin exponer un diccionario parcial

### Requirement: Errores de infraestructura tipados
El sistema SHALL distinguir fichero ausente, JSON inválido, versión duplicada y contrato incompatible.

#### Scenario: Fichero ausente
- **WHEN** no puede localizarse la versión solicitada
- **THEN** se devuelve un error tipado que la CLI puede representar de forma estable
