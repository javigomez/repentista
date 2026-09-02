## Purpose

Proporciona al escritor restricciones métricas orientativas calculadas por código sin confundirlas con una certificación del verso final.

## ADDED Requirements

### Requirement: Presupuesto hasta la última tónica
El sistema SHALL calcular para cada slot el objetivo de siete posiciones, el análisis de su final obligatorio cuando exista y el margen orientativo previo a la tónica final.

#### Scenario: Final agudo conocido
- **WHEN** V4 termina en una palabra aguda analizable
- **THEN** el presupuesto identifica su sílaba tónica final y el espacio orientativo restante

#### Scenario: V1 sin palabra final
- **WHEN** un slot no tiene final obligatorio
- **THEN** recibe el objetivo global y restricciones de finales permitidos sin inventar un presupuesto exacto

### Requirement: Incertidumbre explícita
El sistema SHALL marcar como dudoso cualquier presupuesto basado en análisis de palabra no confiable.

#### Scenario: Palabra no analizable
- **WHEN** el adaptador no ofrece tonicidad confiable
- **THEN** la rama no usa ese presupuesto para redactar
