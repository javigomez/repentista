# cli/generate-quatrains Specification

## Purpose
Expone el caso de uso completo mediante un comando de terminal que recibe contexto y devuelve una lista JSON de las mejores cuartetas.

## Requirements

### Requirement: Comando principal de generación
La CLI SHALL aceptar contexto, proveedor `openai|opencode`, versión de diccionario, tamaño de lote, top-K y umbral, con defaults explícitos.

#### Scenario: Generación satisfactoria
- **WHEN** la entrada es válida y el caso de uso produce finalistas
- **THEN** stdout contiene JSON con la lista ordenada, trazabilidad y resumen de ejecución, y el proceso termina satisfactoriamente

#### Scenario: Entrada inválida
- **WHEN** falta contexto o un argumento no cumple su tipo/rango
- **THEN** stderr explica los campos, stdout no contiene un resultado engañoso y el código de salida indica entrada inválida

### Requirement: Lista parcial o vacía explícita
La CLI SHALL representar de forma distinta éxito completo, resultado parcial, ausencia de finalistas y fallo operativo.

#### Scenario: Menos de top-K
- **WHEN** solo sobreviven dos candidatas de cinco solicitadas
- **THEN** devuelve las dos, el déficit y un estado parcial sin rellenar la lista

### Requirement: Adaptador delgado
La CLI MUST NOT ejecutar reglas lingüísticas ni llamadas de proveedor fuera del composition root y el caso de uso.

#### Scenario: Test de delegación
- **WHEN** se inyecta un caso de uso falso
- **THEN** los argumentos se traducen una vez y la salida refleja su respuesta sin lógica duplicada
