## Purpose

Asigna a cada rol imágenes, acciones y relaciones concretas que guían la escritura y mantienen una sola escena narrativa.

## ADDED Requirements

### Requirement: Anclas por rol
El sistema SHALL producir anclas diferenciadas para V1 presentación, V2 preparación, V3 giro/tensión y V4 remate, respetando las palabras finales ya fijadas.

#### Scenario: Plan de anclas válido
- **WHEN** cada verso tiene objetivo, elementos semánticos y restricciones compatibles
- **THEN** se crea un artefacto de anclas sin versos completos

#### Scenario: Contradicción con palabras finales
- **WHEN** un ancla requiere cambiar la palabra fijada de V2 o V4
- **THEN** la salida se rechaza y se informa la contradicción

### Requirement: Unidad de escena
El sistema SHALL exigir referentes compartidos o relaciones explícitas que conecten los cuatro roles.

#### Scenario: Cuatro ideas aisladas
- **WHEN** las anclas no comparten escena ni progresión
- **THEN** el plan no avanza al presupuesto métrico
