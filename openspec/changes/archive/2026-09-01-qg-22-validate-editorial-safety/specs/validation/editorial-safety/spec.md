## Purpose

Aplica una política editorial versionada y determinista para bloquear contenido explícitamente inadecuado antes de cualquier ranking.

## ADDED Requirements

### Requirement: Reglas editoriales bloqueantes
El validador SHALL analizar texto y anclas contra categorías, términos y combinaciones prohibidas de una política versionada.

#### Scenario: Sin coincidencias
- **WHEN** ningún verso ni ancla activa una regla
- **THEN** devuelve `VALIDO` con versión de política

#### Scenario: Coincidencia inequívoca
- **WHEN** un fragmento activa una regla bloqueante exacta
- **THEN** devuelve `INVALIDO` con regla, slot y fragmento localizado

### Requirement: Casos contextuales dudosos
El validador SHALL distinguir coincidencias ambiguas que requieren revisión y MUST NOT pedir al LLM que las apruebe.

#### Scenario: Término polisémico
- **WHEN** una regla no puede decidirse por el contexto determinista disponible
- **THEN** devuelve `DUDOSO` y el candidato no avanza automáticamente
