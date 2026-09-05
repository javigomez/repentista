# validation/answer-ambiguity Specification

## Purpose
Enumera alternativas formalmente compatibles desde el diccionario cerrado y bloquea o marca como dudoso un candidato cuya respuesta no sea inequívoca.

## Requirements

### Requirement: Enumeración cerrada
El validador SHALL enumerar todas las palabras aprobadas que cumplen familia, rol, categoría y restricciones explícitas del hueco evaluado.

#### Scenario: Respuesta formalmente única
- **WHEN** solo la palabra objetivo supera todos los filtros deterministas
- **THEN** devuelve `VALIDO` y `correctAnswers` contiene únicamente esa palabra

#### Scenario: Varias alternativas aprobadas
- **WHEN** más de una palabra supera los filtros y está declarada válida por el contrato editorial
- **THEN** devuelve `INVALIDO` con la lista completa para reescritura

### Requirement: Semántica no inventada
El validador SHALL devolver `DUDOSO` si quedan alternativas formales cuya plausibilidad semántica no puede resolverse con metadatos deterministas.

#### Scenario: Alternativa semántica incierta
- **WHEN** una segunda palabra encaja formalmente pero no existe una regla editorial que la descarte
- **THEN** el candidato no avanza automáticamente y el informe conserva la alternativa
