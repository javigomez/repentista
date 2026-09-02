## Purpose

Selecciona una palabra aprobada que exprese el sentido del remate antes de explorar su pareja rimante y de redactar V4.

## ADDED Requirements

### Requirement: Selección desde lista cerrada
El sistema SHALL presentar al selector únicamente palabras aprobadas, compatibles con el plan y permitidas como remate, y SHALL aceptar solo una de ellas.

#### Scenario: Selección válida
- **WHEN** el LLM prioriza una opción de la lista cerrada
- **THEN** se devuelve palabra, razones semánticas, alternativas y referencia a la versión del diccionario

#### Scenario: Palabra inventada
- **WHEN** la respuesta elige una palabra que no estaba entre las candidatas
- **THEN** se rechaza la selección sin añadirla al diccionario

### Requirement: Ausencia de remate viable
El sistema SHALL detener la rama si no hay palabras aprobadas con familia y rol de remate utilizables.

#### Scenario: Lista vacía
- **WHEN** los filtros no producen candidatas
- **THEN** se devuelve un fallo de planificación con los filtros aplicados
