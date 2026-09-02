## Purpose

Certifica que todas las palabras controladas por el plan proceden del snapshot editorial aprobado y están habilitadas para su rol.

## ADDED Requirements

### Requirement: Pertenencia y permiso
El validador SHALL comprobar las palabras finales y cualquier ancla marcada como obligatoria contra la versión exacta del diccionario.

#### Scenario: Palabras autorizadas
- **WHEN** V2 y V4 existen, están aprobadas y permiten preparación/remate respectivamente
- **THEN** devuelve `VALIDO` con referencias de entrada y versión

#### Scenario: Palabra ausente o pendiente
- **WHEN** una palabra controlada no existe o no está aprobada
- **THEN** devuelve `INVALIDO` con forma, slot y estado encontrado

### Requirement: Informe exhaustivo
El validador SHALL devolver todas las infracciones léxicas de la ejecución.

#### Scenario: V2 y V4 inválidas
- **WHEN** ambas incumplen reglas distintas
- **THEN** el informe contiene ambos motivos sin detenerse en el primero
