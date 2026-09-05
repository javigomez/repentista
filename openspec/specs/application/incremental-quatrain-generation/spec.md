# application/incremental-quatrain-generation Specification

## Purpose
Coordina el proceso completo desde un brief hasta una lista de cuartetas finalistas, dividiendo la creatividad en estados y haciendo cumplir cada puerta técnica.

## Requirements

### Requirement: Flujo incremental obligatorio
El caso de uso SHALL avanzar por brief, plan semántico, V4, pareja V2, anclas, presupuestos, escritura y validación de cada verso, cuarteta completa, evaluaciones, reparación, score y ranking.

#### Scenario: Generación satisfactoria
- **WHEN** una o más ramas completan todos los estados y superan umbral
- **THEN** se devuelve una lista ordenada de finalistas con plan, versos, validaciones, score y procedencia

#### Scenario: Intento de cuarteta monolítica
- **WHEN** un colaborador devuelve contenido de estados futuros
- **THEN** la transición se rechaza y el orquestador no salta validaciones intermedias

### Requirement: Bloqueos antes de scoring
El caso de uso MUST NOT evaluar ni puntuar un candidato con estructura, métrica, rima, léxico, ambigüedad o seguridad distinto de `VALIDO`.

#### Scenario: Fallo de V2 métrica
- **WHEN** V2 no es válida tras sus reparaciones permitidas
- **THEN** esa rama se rechaza antes de escribir o puntuar una cuarteta final

### Requirement: Lotes, límites y backtracking
El caso de uso SHALL respetar tamaño de lote, top-K, umbral y presupuestos de reintento, y SHALL poder volver a alternativas previas sin ciclos infinitos.

#### Scenario: No hay pareja para V4
- **WHEN** una palabra de remate agota parejas viables
- **THEN** se prueba la siguiente alternativa de V4 dentro del presupuesto

### Requirement: Resultado auditable
La respuesta SHALL separar `finalists` de un resumen de ramas rechazadas y métricas de rendimiento, sin marcar ninguna cuarteta como `APROBADO`.

#### Scenario: Ninguna finalista
- **WHEN** todas las ramas fallan o quedan bajo umbral
- **THEN** se devuelve lista vacía, estado no confiable y motivos agregados sin inventar resultado
