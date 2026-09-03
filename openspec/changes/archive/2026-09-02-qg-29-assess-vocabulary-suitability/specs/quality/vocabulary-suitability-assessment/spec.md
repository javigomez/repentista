## Purpose

Evalúa si el vocabulario completo de la cuarteta es claro, cotidiano y apropiado para lectores de 10–12 años sin resultar condescendiente.

## ADDED Requirements

### Requirement: Adecuación por palabra y contexto
El sistema SHALL devolver nota global, palabras señaladas, motivo y nivel observado usando metadatos del diccionario y contexto.

#### Scenario: Vocabulario adecuado
- **WHEN** las palabras relevantes son cotidianas y comprensibles en su uso concreto
- **THEN** el informe no señala obstáculos y asigna la nota correspondiente

#### Scenario: Palabra aprobada pero demasiado culta
- **WHEN** una entrada permitida resulta inadecuada para el nivel del brief
- **THEN** se identifica como problema blando sin convertirla en ausente del diccionario

### Requirement: Distinción de validación léxica
El evaluador MUST NOT sustituir la comprobación de pertenencia al diccionario.

#### Scenario: Palabra controlada ausente
- **WHEN** el validador léxico ya ha fallado
- **THEN** no se ejecuta esta evaluación
