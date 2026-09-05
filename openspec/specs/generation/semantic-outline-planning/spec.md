# generation/semantic-outline-planning Specification

## Purpose
Convierte el brief en una intención narrativa estructurada antes de elegir rimas o redactar versos, reduciendo la carga simultánea del LLM.

## Requirements

### Requirement: Plan sin versos
El sistema SHALL producir idea central, escena, recurso, giro, intención final, función de V1–V4 y riesgos, y MUST NOT aceptar versos ni palabras finales en esta etapa.

#### Scenario: Plan válido
- **WHEN** el LLM devuelve todos los campos conforme al esquema
- **THEN** el plan se guarda con prompt, modelo, advertencias y referencia al brief

#### Scenario: El modelo se adelanta
- **WHEN** la respuesta contiene versos completos o fija palabras de rima
- **THEN** la salida se rechaza como incumplimiento de etapa y puede reintentarse dentro del límite

### Requirement: Fallo acotado
El sistema SHALL limitar los intentos de planificación y SHALL devolver un fallo explicable si no obtiene un plan válido.

#### Scenario: Reintentos agotados
- **WHEN** todas las respuestas incumplen el esquema
- **THEN** la rama termina sin iniciar selección de palabras
