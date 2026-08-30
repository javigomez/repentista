## Purpose

Detecta frases de relleno, causalidades inventadas y giros que solo existen para satisfacer la rima.

## ADDED Requirements

### Requirement: Diagnóstico de ripio
El sistema SHALL devolver presencia, severidad, fragmentos y razones basadas en la prueba de si la expresión seguiría siendo razonable sin la obligación de rimar.

#### Scenario: Relación natural
- **WHEN** la pareja rimante participa en una relación semántica comprensible
- **THEN** el detector no marca ripio y explica la función de ambos versos

#### Scenario: Causalidad forzada
- **WHEN** una relación solo parece existir para cerrar la rima
- **THEN** se marca el fragmento y la severidad correspondiente

### Requirement: Señales observables
El detector SHALL considerar muletillas, repetición morfológica y patrones editoriales negativos además del juicio LLM.

#### Scenario: Patrón conocido
- **WHEN** el texto coincide con un patrón negativo versionado
- **THEN** la evidencia incluye el identificador de ese patrón
