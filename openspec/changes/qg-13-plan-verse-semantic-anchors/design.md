## Context

Las palabras rimantes son restricciones; las anclas devuelven libertad semántica controlada al escritor.

## Goals / Non-Goals

**Goals:** cohesión temprana y objetivos locales por verso.

**Non-Goals:** texto final, scoring o validación de coherencia completa.

## Decisions

- El DTO separará elementos obligatorios, opcionales y prohibidos por verso.
- El prompt recibirá plan y palabras finales, pero no ejemplos que obliguen a copiar frases.
- Una validación estructural comprobará referencias y ausencia de texto con apariencia de verso.

## Risks / Trade-offs

- [Anclas demasiado rígidas] → Permitir alternativas por rol y que el escritor elija combinaciones.
- [Cohesión aparente] → El evaluador de coherencia posterior seguirá siendo necesario.
