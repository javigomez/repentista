# domain/auditable-quatrain-candidate Specification

## Purpose
Representa cada intento de cuarteta junto con su plan, estados y evidencias para poder aceptarlo, repararlo o rechazarlo de forma auditable.

## Requirements

### Requirement: Candidato completo y trazable
El sistema SHALL representar cuatro slots ordenados V1–V4, sus roles, palabras finales planificadas, resultados de etapas y versiones de los componentes que actuaron.

#### Scenario: Creación desde un plan
- **WHEN** se crea un candidato con identificador, brief y plan válidos
- **THEN** comienza en el estado inicial permitido y conserva referencias inmutables a su procedencia

### Requirement: Transiciones válidas
El sistema SHALL permitir únicamente transiciones declaradas y SHALL conservar cada rechazo, reparación y diagnóstico sin sobrescribir el histórico.

#### Scenario: Transición no permitida
- **WHEN** se intenta puntuar un candidato que no superó validación dura
- **THEN** la transición se rechaza con el estado actual y los prerrequisitos ausentes

#### Scenario: Rechazo auditable
- **WHEN** un validador bloquea el candidato
- **THEN** el candidato queda rechazado con validador, versión, motivo y evidencia localizable
