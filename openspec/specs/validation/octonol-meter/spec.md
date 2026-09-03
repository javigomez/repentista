# validation/octonol-meter Specification

## Purpose
Certifica que un verso alcanza exactamente siete posiciones métricas hasta su última sílaba tónica bajo una política conservadora y explicable.

## Requirements

### Requirement: Recuento hasta última tónica
El validador SHALL tokenizar, analizar palabras, aplicar solo sinalefas naturales autorizadas y exigir `positionsToLastStress = 7`.

#### Scenario: Final llano válido
- **WHEN** la escansión confiable de un verso llano sitúa la última tónica en la posición siete
- **THEN** devuelve `VALIDO` con segmentación, tónica, sinalefas, total fonético y confianza

#### Scenario: Recuento incorrecto
- **WHEN** la última tónica queda antes o después de siete
- **THEN** devuelve `INVALIDO` con diferencia respecto al objetivo

### Requirement: Conservadurismo explícito
El validador MUST NOT aprobar esdrújulas, licencias prohibidas ni versos que solo cuadren con una sinalefa dudosa.

#### Scenario: Decisión dudosa necesaria
- **WHEN** alcanzar siete depende de una unión clasificada como dudosa
- **THEN** devuelve `DUDOSO` y conserva ambas lecturas
