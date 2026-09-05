## Purpose

Selecciona una lista top-K estable entre candidatos puntuados, respetando umbral de calidad y evitando devolver variantes redundantes.

## ADDED Requirements

### Requirement: Ranking por calidad y diversidad
El sistema SHALL descartar scores bajo umbral, ordenar por score y aplicar una política versionada de diversidad antes de llenar top-K.

#### Scenario: Suficientes candidatos diversos
- **WHEN** hay al menos K candidatos sobre umbral y no redundantes
- **THEN** se devuelve exactamente K en orden estable con razones de selección

#### Scenario: Candidato alto pero redundante
- **WHEN** un candidato repite fuertemente otro ya seleccionado
- **THEN** puede ser pospuesto o excluido según política y el informe registra la penalización

### Requirement: Resultado parcial explícito
El sistema SHALL devolver menos de K cuando no haya suficientes candidatos elegibles y SHALL explicar el déficit.

#### Scenario: Solo dos supervivientes
- **WHEN** top-K es cinco y solo dos superan todas las puertas
- **THEN** devuelve esos dos sin rellenar con inválidos o candidatos bajo umbral

### Requirement: Determinismo
El sistema SHALL usar desempates estables ante score y diversidad iguales.

#### Scenario: Repetición del ranking
- **WHEN** entrada, configuración y versiones son iguales
- **THEN** la lista y sus razones son idénticas
