## Context

QG-40 diseñó `inspect-rhymes` como consumidor del diccionario, el análisis lingüístico y el catálogo aprobado. La implementación resultante consulta todas las entradas del diccionario y contiene una segunda extracción de claves consonantes. QG-08 ya proporciona el catálogo que debe poseer esa regla.

## Goals / Non-Goals

**Goals:**

- Reducir el caso de uso a orquestar fuentes existentes y formar un DTO diagnóstico.
- Mantener separadas la cola calculada por análisis y la familia editorial aprobada.
- Hacer que los tests fallen si el caso de uso evita el catálogo.

**Non-Goals:**

- Cambiar el algoritmo fonético o la política editorial del catálogo.
- Añadir nuevas familias o palabras.
- Rediseñar el conjunto completo de comandos CLI.

## Decisions

1. El caso de uso recibirá un puerto del catálogo como dependencia obligatoria. Se descarta conservar `extractRhymeKey` en aplicación porque duplicaría la regla aunque se usara solo como fallback.
2. El analizador servirá para presentar trazabilidad y verificar consistencia. No podrá decidir por sí solo la lista de candidatas.
3. Una divergencia análisis/catálogo será un resultado dudoso explícito. Se descarta preferir automáticamente uno de los dos porque ocultaría corrupción, incompatibilidad de versiones o un defecto lingüístico.
4. Candidatas, filtros, exclusiones y orden se obtendrán mediante la API del catálogo. Si su contrato actual no expone toda la evidencia necesaria, se ampliará dentro del propietario en lugar de recorrer el diccionario desde la aplicación.
5. Las pruebas usarán un catálogo espía y fixtures donde la semejanza ortográfica contradiga deliberadamente la pertenencia aprobada. Así no pueden quedar verdes con una reimplementación equivalente.

## Risks / Trade-offs

- [La API actual del catálogo no expone toda la trazabilidad] → Añadir el mínimo DTO de consulta dentro de QG-08 sin mover el algoritmo a aplicación.
- [Cambio de forma del JSON de QG-40] → Mantener campos compatibles y añadir un código explícito para inconsistencia; documentar cualquier incompatibilidad inevitable.
- [QG-40 aún no está archivado] → Integrar primero QG-08 y QG-40; validar este cambio contra ese estado antes de aplicar.

## Migration Plan

1. Añadir primero tests de regresión que fallen con el cálculo local.
2. Introducir la dependencia del catálogo y adaptar composición/fixtures.
3. Eliminar toda extracción de claves consonantes de aplicación y CLI.
4. Ejecutar aceptación, arquitectura, suite completa y build.
5. Revertir el cambio si la nueva API del catálogo altera consumidores no relacionados; no restaurar el fallback local.

