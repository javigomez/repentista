# quality/naturalness-assessment Specification

## Purpose
Evalúa de forma trazable si un candidato técnicamente válido suena como castellano natural sin convertir una preferencia editorial en regla dura.

## Requirements

### Requirement: Evaluación estructurada de naturalidad
El sistema SHALL devolver una nota en la escala versionada, confianza, fragmentos problemáticos y razones observables para cada candidato elegible.

#### Scenario: Evaluación válida
- **WHEN** el candidato superó todos los bloqueos y el LLM responde conforme al esquema
- **THEN** la evaluación se asocia al candidato con modelo, prompt, rúbrica y evidencias

#### Scenario: Candidato inválido
- **WHEN** existe un bloqueo duro
- **THEN** el evaluador no se ejecuta y no produce una nota

### Requirement: Salida no certificadora
La evaluación MUST NOT modificar resultados duros ni el texto del candidato.

#### Scenario: Nota alta con bloqueo previo
- **WHEN** se intenta adjuntar una evaluación a un candidato inválido
- **THEN** la operación se rechaza por estado incompatible
