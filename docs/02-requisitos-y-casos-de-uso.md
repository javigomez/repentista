# Requisitos y casos de uso

## Requisitos funcionales

| ID | Área | Requisito | Prioridad |
|---|---|---|---|
| RF-01 | Juego | Todas las cuartetas jugables deben cumplir octoñol: siete posiciones métricas hasta la última tónica. | Must |
| RF-02 | Juego | Cada reto debe declarar su esquema de rima, inicialmente solo `-A-A` (`0-A-0-A`). | Must |
| RF-03 | Contenido | Las palabras objetivo deben pertenecer al diccionario interno aprobado. | Must |
| RF-04 | Contenido | Cada palabra debe tener tonicidad; inicialmente solo agudas y llanas. | Must |
| RF-05 | Contenido | El vocabulario debe ser comprensible para 10–12 años sin infantilizarse. | Must |
| RF-06 | Contenido | Cada palabra debe tener emoji cuando sea posible y claridad visual graduada. | Should |
| RF-07 | Contenido | Cada entrada debe incluir categoría gramatical. | Must |
| RF-08 | Contenido | Se favorecen rimas entre categorías distintas y sustantivos; se evita abusar de infinitivos o participios emparejados. | Should |
| RF-09 | Calidad | Antes de publicar, se deben enumerar todas las respuestas razonables y aceptables. | Must |
| RF-10 | Calidad | Una rima formalmente correcta pero semánticamente forzada debe rechazarse como ripio. | Must |
| RF-11 | Calidad | Los niveles avanzados deben valorar giro, sorpresa, imagen o humor en el cuarto verso. | Should |
| RF-12 | Interfaz | La interfaz debe ser mobile-first y manejable con una sola mano. | Must |
| RF-13 | Interfaz | Los primeros retos deben ofrecer entre 2 y 4 botones grandes con emoji y palabra. | Must |
| RF-14 | Interfaz | Al resolver, la cuarteta actual sale hacia arriba y la siguiente entra desde abajo. | Should |
| RF-15 | Sesión | El jugador puede abandonar en cualquier momento sin perder el progreso. | Must |
| RF-16 | Persistencia | El progreso se guarda automáticamente después de cada respuesta. | Must |
| RF-17 | Arquitectura | El juego solo consume contenido con estado QA `APROBADO`. | Must |
| RF-18 | Revalidación | Cada reto guarda la versión del validador que lo aprobó. | Should |

## Requisitos del generador

- Trabajar con una plantilla intermedia, no con una petición abierta de “escribe una cuarteta”.
- Elegir primero el concepto y la palabra final del remate.
- Buscar la pareja de rima solo en el diccionario aprobado.
- Construir primero los versos finales y después los versos de conducción.
- Generar lotes configurables de candidatos y filtrar en varias etapas.
- Separar validación de puntuación: primero se descartan bloqueos y después se puntúan los supervivientes.
- Permitir solicitar un mínimo de calidad y una cantidad máxima de resultados, por ejemplo `100` candidatos, score mínimo `80` y devolver los mejores `5`.
- Conservar los candidatos rechazados y sus motivos sin incorporarlos al banco jugable.
- Exportar al juego únicamente contenido con estado `APROBADO`.
- Devolver un objeto estructurado con versos, planificación, validaciones, respuestas y distractores.

## Casos de uso del jugador

### CU-01 — Empezar una partida

**Actor:** jugador.

**Flujo:**

1. Abre el juego.
2. El sistema carga el nivel y reto pendientes, o inicia una nueva partida.
3. Presenta una cuarteta con una palabra oculta.

**Resultado:** el jugador puede responder sin configuración previa.

### CU-02 — Completar una palabra por rima

1. El jugador lee la cuarteta.
2. Elige una opción entre 2–4 botones.
3. El sistema comprueba la respuesta contra `correct_answers`.
4. Calcula puntos, racha y progreso de habilidad.
5. Hace autosave.

### CU-03 — Recibir feedback

El juego debe indicar de forma breve si la elección es correcta y mantener el ritmo de la partida. La explicación métrica detallada pertenece al QA y al modo pedagógico futuro, no al flujo principal inicial.

### CU-04 — Abandonar y reanudar

1. El jugador abandona después de una o varias cuartetas.
2. El estado se conserva automáticamente.
3. Al volver, aparece “Seguimos donde lo dejaste” y el reto pendiente.

### CU-05 — Adaptar la práctica

El sistema registra familias y habilidades problemáticas. Puede volver a introducir una familia fallada, como `-ente`, y reducir la frecuencia de una familia dominada, como `-ón`.

## Casos de uso del generador

### CU-06 — Planificar un reto

El autor define tema, objetivo pedagógico, tono, esquema, nivel y tipo de reto. El planner elige concepto de cierre, remate y familias de rima candidatas.

### CU-07 — Generar y filtrar una cuarteta

El writer genera variantes desde las palabras finales. Los validadores filtran métrica, rima, diccionario, naturalidad, ambigüedad y ripio. El editor selecciona o reformula la mejor superviviente.

### CU-08 — Aprobar contenido

El sistema busca soluciones alternativas, genera distractores, calcula la puntuación de calidad y solo inserta el reto en el banco si no hay bloqueos y supera el umbral de publicación.

### CU-09 — Revalidar el banco

Al cambiar el algoritmo, el sistema puede revalidar los retos usando `version_validator` y detectar contenido que debe revisarse.

## Requisitos no funcionales

- La decisión de validez debe ser reproducible con la misma entrada y versión.
- El juego no debe depender de una llamada a un modelo para resolver una interacción.
- El contenido debe poder auditarse mediante escansiones y razones de rechazo.
- El banco debe permitir versionado y migraciones.
- Las métricas y rimas deben poder probarse con tests unitarios.
