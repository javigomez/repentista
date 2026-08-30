## Purpose

Genera variantes independientes de un único verso bajo restricciones locales para que cada propuesta pueda validarse antes de ensamblar la cuarteta.

## ADDED Requirements

### Requirement: Una sola posición por operación
El sistema SHALL recibir exactamente un rol, anclas, presupuesto y final opcional, y SHALL devolver solo variantes de ese verso.

#### Scenario: Generación de V2
- **WHEN** se solicita V2 con una palabra final obligatoria
- **THEN** todas las variantes devueltas contienen esa palabra exactamente al final y ninguna incluye otros versos

#### Scenario: Salida monolítica
- **WHEN** el LLM devuelve una cuarteta o cambia una restricción fija
- **THEN** la respuesta completa se rechaza como incumplimiento de contrato

### Requirement: Lote estructurado y limitado
El sistema SHALL asignar identidad a cada variante, limitar cantidad e intentos y conservar procedencia sin afirmar validez.

#### Scenario: Variantes aceptadas como borradores
- **WHEN** la salida cumple el esquema de escritor
- **THEN** sus elementos quedan en estado de borrador pendiente de validación dura
