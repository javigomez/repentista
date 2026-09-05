# repair/constrained-soft-quality Specification

## Purpose
Repara un diagnóstico blando localizado sin alterar restricciones duras ni partes del candidato que no fueron autorizadas.

## Requirements

### Requirement: Un defecto por operación
El sistema SHALL recibir una dimensión, evidencias, alcance editable y propiedades que conservar, y SHALL rechazar una solicitud que mezcle diagnósticos incompatibles.

#### Scenario: Reparar ripio en V2
- **WHEN** el diagnóstico localiza ripio en V2 y solo ese slot es editable
- **THEN** las variantes modifican V2, conservan su palabra final y dejan V1/V3/V4 intactos

#### Scenario: Modificación fuera de alcance
- **WHEN** una variante cambia otro verso o una restricción dura
- **THEN** se descarta con el motivo concreto

### Requirement: Validación y reevaluación
Una reparación SHALL superar de nuevo todos los bloqueos y la dimensión objetivo antes de reemplazar al candidato de entrada.

#### Scenario: Mejora blanda rompe métrica
- **WHEN** la evaluación mejora pero un verso deja de ser octoñol
- **THEN** la variante se rechaza

#### Scenario: Sin mejora dentro del límite
- **WHEN** ningún intento mejora el diagnóstico conforme a política
- **THEN** se conserva el candidato original con historial de intentos fallidos
