# quality/humor-assessment Specification

## Purpose
Evalúa el efecto humorístico, absurdo o imaginativo de la cuarteta con una rúbrica separada y apropiada para el público objetivo.

## Requirements

### Requirement: Evaluación de humor explicable
El sistema SHALL devolver nota, mecanismo humorístico, fragmentos que lo producen, claridad y confianza.

#### Scenario: Humor comprensible
- **WHEN** el texto contiene sorpresa, imagen o absurdo accesible y seguro
- **THEN** el informe identifica el mecanismo y lo valora según ejemplos ancla

#### Scenario: Sin mecanismo observable
- **WHEN** la respuesta del juez afirma que es gracioso sin localizar causa textual
- **THEN** la evaluación se rechaza por incumplir el contrato

### Requirement: Precondición de seguridad
El evaluador SHALL ejecutarse únicamente tras superar seguridad editorial.

#### Scenario: Contenido inseguro
- **WHEN** el candidato está bloqueado por seguridad
- **THEN** no recibe nota de humor
