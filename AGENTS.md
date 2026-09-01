# AGENTS.md

## Propósito y alcance actual

Repentista es un proyecto de generación y certificación de cuartetas humorísticas en castellano. La documentación de referencia está en [`docs/README.md`](docs/README.md) y en los documentos enlazados desde allí.

El diseño global contempla dos productos:

- `QuatrainGenerator`: herramienta de autoría, validación, puntuación y exportación.
- `Game`: cliente que consume contenido estático aprobado.

En esta fase solo se desarrolla `QuatrainGenerator`. No crear UI, pantallas móviles, lógica de juego, autosave de usuario ni generación en tiempo de partida. El generador será una aplicación CLI escrita en TypeScript y ejecutada sobre Node.js. La separación física con `Game` podrá formalizarse más adelante, pero no debe anticiparse trabajo del juego para resolver una necesidad del generador.

El repositorio actual es un esqueleto mínimo. No asumir que los módulos descritos en `docs/` ya existen.

## Regla principal de desarrollo: tests primero

Todo código nuevo debe tener tests escritos antes de implementar el código de producción.

Aplicar siempre el ciclo Red → Green → Refactor:

1. Definir el comportamiento con un test que falle.
2. Implementar lo mínimo para hacerlo pasar.
3. Refactorizar manteniendo todos los tests en verde.

Esto también se aplica a correcciones: primero añadir un test de regresión que reproduzca el defecto. No aceptar código nuevo sin cobertura de su comportamiento normal, casos límite y errores esperados. Los tests no deben limitarse a comprobar que la CLI arranca ni a repetir la implementación internamente.

El proyecto debe exponer un comando `npm test` reproducible. Si todavía no existe, la primera tarea funcional debe configurar el runner y ese script antes de implementar lógica del dominio. Preferir tests TypeScript junto al módulo (`*.test.ts`) y mantener los fixtures lingüísticos versionados y legibles.

Antes de dar una tarea por terminada, ejecutar como mínimo:

```bash
npm test
npm run build
```

No ocultar tests fallidos, errores de compilación ni comportamiento dudoso detrás de mocks. Para aleatoriedad, reloj, filesystem, red o modelos externos, inyectar dependencias y usar dobles deterministas en tests.

En los tests, una aserción fallida debe detener el caso con un diagnóstico explícito. No uses retornos silenciosos para resolver el estrechamiento de tipos después de comprobar un resultado discriminado, por ejemplo `if (!result.ok) return;`: si el resultado debía ser exitoso, usa una aserción que falle o lanza un error explicativo. Los casos que esperan un fallo deben afirmar explícitamente el error, su código y la evidencia relevante.

### Organización obligatoria de tests y fixtures

- Cuando un módulo de dominio acumule comportamientos independientes, separar sus tests por responsabilidad en ficheros `*.test.ts` junto al módulo. Un fichero de test debe cubrir una capacidad coherente —por ejemplo, ciclo de vida, snapshots o una evaluación— y no convertirse en un segundo índice monolítico.
- Usar `describe` anidados para expresar el contexto y la categoría del comportamiento, y `it` para cada caso verificable. Los nombres deben explicar el comportamiento observado, no la implementación interna.
- Mantener los datos repetidos en `test-fixtures.ts` o en fixtures específicos de la capacidad. Cada constructor de fixture debe devolver datos nuevos y deterministas por defecto; sus overrides deben ser explícitos y no compartir arrays u objetos mutables entre casos.
- Los tests que esperan éxito deben fallar de forma explícita si reciben un resultado fallido. Los tests que esperan errores deben comprobar el error concreto; no usar `return` o `continue` para ocultar una aserción que no se ha cumplido.

## Stack y convenciones técnicas

- TypeScript estricto y ESM, coherente con `package.json` y `tsconfig.json`.
- Node.js como runtime de la CLI; no introducir un framework de UI.
- Mantener `strict: true`, evitar `any` y modelar explícitamente estados, resultados y errores.
- Separar dominio puro de IO: los validadores y el scoring deben poder probarse sin consola, filesystem, red ni modelo de IA.
- La CLI debe recibir datos mediante argumentos y/o ficheros, producir salida estructurada —preferentemente JSON— y usar `stderr` para diagnósticos. Los códigos de salida deben distinguir ejecución correcta de entrada inválida o resultado no confiable.
- No introducir dependencias nuevas sin justificar su necesidad, su licencia y su impacto en el CLI.
- No modificar el contrato de datos por conveniencia local. Si una decisión cambia un campo, estado, regla o versión, documentarla y añadir tests de compatibilidad.

## Arquitectura del generador

Organizar el código, cuando aparezcan los módulos, alrededor de estas responsabilidades:

```text
brief → planner → selección del remate y rimas
      → writer → validadores duros
      → ambigüedad/repetición → scoring
      → revisión editorial → exportación
```

La estructura objetivo para el generador es:

```text
src/
├── domain/       # Candidate, Batch, versos, estados y resultados
├── content/      # diccionario, familias de rima y plantillas
├── validators/   # métrica, rima, léxico, naturalidad, ripio
├── pipeline/     # coordinación de lotes y transiciones
├── scoring/      # rúbrica y desglose de calidad
├── export/       # contrato y exportación de aprobados
└── cli/          # parsing de argumentos, IO y códigos de salida
```

La estructura puede evolucionar si mejora la separación de responsabilidades, pero no mezclar reglas lingüísticas con parsing de CLI ni con persistencia. `src/index.ts` debe limitarse a ser un punto de entrada; la lógica debe vivir en módulos testeables.

Los módulos de aplicación deben importarse desde la ruta concreta de su capacidad (por ejemplo, `src/application/<capacidad>/index.ts`). `src/application/index.ts` es un barrel público estable: no debe ser una lista de trabajo que cada feature branch tenga que editar. Las nuevas capacidades deben poder probarse e integrarse sin añadir imports a ese índice común; si se necesita ampliar la API pública, hacerlo en un cambio dedicado y mantener los consumidores internos con imports directos.

## Reglas de producto que son obligatorias

### Métrica

- El octoñol exige exactamente siete posiciones métricas hasta la última sílaba tónica de cada verso.
- Aceptar inicialmente finales agudos y llanos.
- Aplicar una política conservadora: diptongos normales y sinalefas naturales; no aceptar diéresis poética, sinéresis buscada, hiato artificial, pronunciación forzada ni sinalefa discutible necesaria para cuadrar.
- El resultado debe incluir trazabilidad: segmentación, última tónica, posiciones calculadas, sinalefas, tipo de final y confianza.
- Si el análisis es dudoso, devolver `DUDOSO` o rechazar. Nunca convertir una decisión incierta en `VALIDO` silenciosamente.

### Rima y esquema

- Calcular la rima desde la última vocal tónica hasta el final fonético, no comparando simplemente las letras finales.
- La primera versión solo admite rima consonante y el esquema `0-A-0-A` (`-A-A`): V2 y V4 comparten familia; V1 y V3 no tienen rima obligatoria.
- No introducir `ABAB`, asonancia u otras licencias sin una decisión de producto versionada y tests específicos.
- Las familias y palabras utilizables deben proceder del diccionario aprobado. No inventar palabras para completar una rima.

### Planificación y generación

- Generar desde el remate: definir el sentido final, elegir la palabra de V4 por significado, buscar su pareja aprobada para V2 y después construir V1 y V3.
- Declarar la función de cada verso antes de escribirlo: presentación, preparación, giro/tensión y remate.
- Generar lotes de candidatos, no confiar en una única salida.
- Separar validación de puntuación: métrica, rima, diccionario, estructura y ambigüedad son bloqueos; el score no puede rescatar un candidato inválido.
- Conservar candidatos rechazados con sus diagnósticos y motivos. Nunca mezclarlos con el contenido aprobado.

### LLM y calidad editorial

Si se integra un LLM en el CLI, será autor asistido, planificador, crítico blando o reparador. No puede ser el árbitro de decisiones duras. El código debe decidir, de forma reproducible, si:

- un verso cumple la métrica;
- dos palabras riman según la política vigente;
- una palabra pertenece al diccionario aprobado;
- hay respuestas alternativas razonables;
- el paquete de exportación cumple el contrato.

La naturalidad, el humor, la coherencia y el ripio pueden recibir asistencia de un modelo, pero deben conservar prompt, modelo, versión, diagnóstico y resultado. La revisión editorial sigue siendo obligatoria antes de marcar contenido como `APROBADO`.

## Modelo de estados y publicación

Mantener una transición explícita y auditable, al menos conceptualmente:

```text
GENERADO → VALIDACION_PENDIENTE → RECHAZADO | VALIDO
         → PUNTUADO → BAJO_UMBRAL | SELECCIONADO
         → APROBADO | RECHAZADO_EDITORIAL → EXPORTADO
```

Solo se puede exportar contenido con estado `APROBADO`. Cada candidato o lote debe conservar, cuando aplique, identificador, brief normalizado, versiones de validador/rúbrica/prompt, resultados detallados, score, motivos de rechazo y decisión editorial.

La unicidad pertenece al reto completo: antes de publicar, enumerar las palabras del diccionario que riman, encajan gramaticalmente y tienen sentido razonable en el contexto. Si quedan varias respuestas plausibles, reescribir por defecto o declararlas explícitamente en `correct_answers`.

## CLI y límites de integración

La CLI debe favorecer comandos pequeños y componibles, equivalentes a:

```text
validate-batch <batch.json> --dictionary <version>
score-batch <validated.json> --threshold 80
find-ambiguities <validated.json>
check-repetition <validated.json> --bank <approved>
export-approved <selected.json> --out <directory>
```

Los nombres y opciones definitivos deben reflejar el código real. Cada comando debe validar su entrada, producir un informe estructurado y fallar con un código no satisfactorio cuando no pueda dar un resultado confiable. La CLI no debe llamar al LLM ni calcular reglas lingüísticas directamente: debe delegar en servicios de dominio testeados.

## Uso de la documentación

Antes de modificar una parte del sistema, leer `docs/README.md` y los documentos relevantes. En particular:

- visión y requisitos: `01-vision-y-alcance.md`, `02-requisitos-y-casos-de-uso.md`;
- diccionario y motor: `03-diccionario-y-palabras-para-rimar.md`, `04-motor-generador-de-cuartetas.md`;
- validación y datos: `05-validadores-y-control-de-calidad.md`, `06-modelo-de-datos-y-guardado.md`;
- arquitectura y estructura: `08-arquitectura-tecnica.md`, `10-estructura-del-proyecto.md`;
- decisiones y aprendizajes: `09-decisiones-y-cuestiones-abiertas.md`, `11-aprendizajes-para-el-creador-de-cuartetas.md`.

Distinguir siempre entre requisitos decididos, propuestas pendientes y experimentos. Las cuestiones abiertas no deben convertirse en reglas implícitas. Si una implementación descubre una contradicción, conservar la regla más conservadora, añadir un test que la evidencie y documentar la decisión antes de ampliar el alcance.

## Criterio de terminado

Una tarea del generador está terminada cuando:

- el comportamiento fue especificado primero con tests;
- la implementación es TypeScript estricto y mantiene la separación de capas;
- los errores y estados dudosos son explícitos y auditables;
- `npm test` y `npm run build` pasan;
- se han añadido o actualizado fixtures del conjunto de oro cuando afecta a métrica, rima o calidad;
- no se ha introducido UI, runtime de juego ni dependencia de un LLM para certificar contenido.
