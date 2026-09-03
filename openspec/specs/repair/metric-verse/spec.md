# repair/metric-verse Specification

## Purpose
Repara un único verso con defecto métrico preservando su función, sentido, palabra final y todas las propiedades ya válidas.

## Requirements

### Requirement: Reparación acotada por diagnóstico
El sistema SHALL enviar al reparador el verso, escansión, diferencia respecto a siete y restricciones inmutables, y SHALL aceptar solo variantes del mismo slot.

#### Scenario: Verso demasiado largo
- **WHEN** un verso válido en estructura mide más de siete posiciones
- **THEN** el reparador produce variantes más cortas que conservan palabra final y objetivo semántico

#### Scenario: Cambio de final prohibido
- **WHEN** una variante modifica el final fijado de V2 o V4
- **THEN** se descarta antes de revalidar métrica

### Requirement: Revalidación obligatoria
Cada variante SHALL volver a pasar estructura, métrica y demás bloqueos afectados antes de considerarse reparada.

#### Scenario: Reparación aparente
- **WHEN** el LLM afirma que una variante mide bien pero el validador discrepa
- **THEN** prevalece el validador y el intento queda fallido

#### Scenario: Presupuesto agotado
- **WHEN** se alcanza el máximo de intentos sin variante válida
- **THEN** la rama termina rechazada sin relajar reglas
