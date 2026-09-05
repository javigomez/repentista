# cli/validate-candidate Specification

## Purpose
Permite validar de forma reproducible una cuarteta existente y obtener un informe completo sin generar texto ni llamar a un LLM.

## Requirements

### Requirement: Entrada estructurada
La CLI SHALL aceptar un candidato JSON por fichero o stdin y una versión explícita de diccionario/políticas.

#### Scenario: Candidato válido
- **WHEN** la entrada cumple contrato y todos los validadores duros devuelven `VALIDO`
- **THEN** stdout contiene un informe por validador y el código de salida es satisfactorio

#### Scenario: Contrato inválido
- **WHEN** faltan versos, plan o versiones requeridas en el JSON
- **THEN** se devuelve un error de entrada sin ejecutar validadores parciales

### Requirement: Diagnóstico completo de bloqueos
El comando SHALL ejecutar estructura, métrica, rima, léxico, ambigüedad, duplicación aplicable y seguridad, manteniendo cada resultado separado.

#### Scenario: Métrica y léxico fallan
- **WHEN** el candidato contiene ambos defectos
- **THEN** el informe conserva los dos diagnósticos y termina con código no satisfactorio

### Requirement: Ejecución offline
El comando MUST NOT invocar OpenAI, OpenCode ni evaluadores blandos.

#### Scenario: Sin credenciales
- **WHEN** se ejecuta en un entorno sin configuración LLM
- **THEN** puede completar la validación determinista
