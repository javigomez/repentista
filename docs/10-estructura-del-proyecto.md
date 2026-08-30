# Estructura del proyecto y pipeline de generación

## Decisión principal

Repentista se organiza como dos productos separados:

1. **`Game`**: el juego móvil que presenta retos ya preparados.
2. **`QuatrainGenerator`**: la herramienta interna de autoría que genera, valida, puntúa y publica cuartetas.

El juego no genera cuartetas, no ejecuta los validadores lingüísticos y no necesita un modelo de IA para funcionar. Recibe un paquete de contenido estático exportado por `QuatrainGenerator`.

La frontera entre ambos productos es un contrato de contenido versionado. Solo se exportan al juego los retos con estado `APROBADO`.

## Estructura de carpetas propuesta

```text
repentista/
├── Game/
│   ├── README.md
│   ├── src/
│   │   ├── content/          # Carga y consulta de retos estáticos
│   │   ├── gameplay/         # Sesión, respuestas y flujo de partida
│   │   ├── progression/      # Niveles, habilidades y adaptación
│   │   ├── persistence/      # Autosave y reanudación
│   │   └── ui/               # Pantallas, cuartetas y controles móviles
│   ├── data/
│   │   ├── challenges/       # JSON publicado, versionado con el juego
│   │   └── manifest.json     # Versión y metadatos del paquete
│   └── tests/
│
├── QuatrainGenerator/
│   ├── README.md
│   ├── skill/
│   │   └── generate-quatrains/
│   │       ├── SKILL.md      # Orquestación para generar y publicar lotes
│   │       ├── prompts/      # Plantillas de generación
│   │       └── references/   # Reglas, contrato y rúbrica editorial
│   ├── src/
│   │   ├── domain/           # Candidate, Batch, ValidationResult, Score
│   │   ├── pipeline/         # Estados y coordinación de etapas
│   │   ├── validators/       # Métrica, rima, léxico, etc.
│   │   ├── scoring/          # Puntuación de calidad y desglose
│   │   ├── content/          # Diccionario, plantillas y banco editorial
│   │   └── export/           # Contrato y exportación hacia Game
│   ├── scripts/
│   │   ├── validate-batch.ts
│   │   ├── score-batch.ts
│   │   ├── find-ambiguities.ts
│   │   ├── check-repetition.ts
│   │   └── export-approved.ts
│   ├── data/
│   │   ├── dictionary/       # Palabras y familias de rima aprobadas
│   │   ├── templates/        # Briefs y estructuras de verso
│   │   ├── candidates/       # Lotes de trabajo no publicados
│   │   ├── rejected/         # Candidatos y motivos de descarte
│   │   └── approved/         # Fuente editorial de los retos publicados
│   ├── schemas/              # JSON Schema de entrada, candidato y exportación
│   └── tests/
│
└── docs/
```

Los nombres son una propuesta. Si el runtime final del juego exige otra convención, puede cambiarse `Game` por el nombre del framework o plataforma sin modificar la responsabilidad de cada área.

## Responsabilidad de la skill

`generate-quatrains/SKILL.md` es la interfaz de autoría. Recibe un brief como este:

```yaml
tema: "dragones despistados"
objetivo_pedagogico: "rima consonante"
tono: "absurdo y cercano"
nivel: 2
esquema: "-A-A"
cantidad: 100
puntuacion_minima: 80
cantidad_a_devolver: 5
```

La skill debe:

1. Normalizar el brief y completar la planificación del remate.
2. Generar un lote de candidatos con salida estructurada.
3. Ejecutar los scripts deterministas de validación.
4. Eliminar candidatos inválidos y conservar sus motivos de rechazo.
5. Ejecutar el puntuador sobre los candidatos que hayan pasado los bloqueos.
6. Filtrar por `puntuacion_minima` y ordenar por puntuación.
7. Presentar los mejores candidatos para revisión editorial.
8. Exportar únicamente los que el editor marque como `APROBADO`.

La skill coordina el proceso; no sustituye a los validadores. Una afirmación del modelo como “rima” o “mide bien” no es suficiente para aprobar un candidato.

## Pipeline de un lote

```text
BRIEF
  ↓
PLANIFICACIÓN DEL REMATE
  ↓
GENERACIÓN DE N CANDIDATOS
  ↓
CONTRATO / ESQUEMA
  ↓
VALIDADORES DUROS
  ├─ métrica y escansión
  ├─ rima
  ├─ diccionario y tonicidad
  ├─ naturalidad mínima
  └─ estructura y seguridad editorial
  ↓
DESDUPLICACIÓN, AMBIGÜEDAD Y REPETICIÓN
  ↓
PUNTUACIÓN DE CALIDAD
  ↓
FILTRO: score ≥ umbral
  ↓
RANKING Y TOP-K
  ↓
REVISIÓN EDITORIAL
  ↓
EXPORTACIÓN ESTÁTICA A Game/data
```

La ejecución puede paralelizar validadores independientes, pero un candidato no pasa a puntuación si falla un bloqueo. Por ejemplo, de 100 candidatos pueden sobrevivir 50 a la validación y solo 5 superar `80/100`; esos 5 son los que se devuelven para selección editorial.

## Validación frente a puntuación

Son etapas distintas:

| Etapa | Pregunta | Resultado |
|---|---|---|
| Validación | “¿Es utilizable y cumple las reglas?” | pasa, dudoso o rechazado |
| Puntuación | “¿Qué calidad tiene entre los utilizables?” | desglose y score de 0 a 100 |
| Selección | “¿Cuáles merece la pena conservar?” | ranking y top-K |
| QA editorial | “¿Lo publicaríamos en el juego?” | aprobado o rechazado |

La métrica, la rima y una palabra fuera del diccionario son bloqueos. Humor, giro, naturalidad, coherencia y originalidad contribuyen al score, pero una puntuación alta nunca puede saltarse un bloqueo.

## Puntuación recomendada

Se mantiene la rúbrica definida en la documentación de QA:

| Dimensión | Peso |
|---|---:|
| Métrica | 20 |
| Rima | 20 |
| Naturalidad | 20 |
| Coherencia | 15 |
| Remate | 10 |
| Humor | 5 |
| Vocabulario | 5 |
| Originalidad | 5 |
| **Total** | **100** |

En la práctica, métrica y rima deben estar validadas antes de puntuar. Por eso sus 40 puntos funcionan también como garantía de que el score no premie una cuarteta formalmente incorrecta.

El puntuador debe devolver el desglose, las reglas aplicadas, la versión de la rúbrica y una explicación breve. Si usa una evaluación asistida por IA para humor u originalidad, esa evaluación será orientativa y quedará sujeta a revisión editorial.

## Estados y trazabilidad

Cada candidato conserva su historial:

```text
GENERADO
  → VALIDACION_PENDIENTE
  → RECHAZADO | VALIDO
  → PUNTUADO
  → BAJO_UMBRAL | SELECCIONADO
  → APROBADO | RECHAZADO_EDITORIAL
  → EXPORTADO
```

El lote debe guardar al menos:

- `batch_id`, brief normalizado, fecha y versión de prompts.
- Cantidad solicitada, cantidad generada, válidos, puntuados y seleccionados.
- Semilla o identificador de cada candidato.
- Resultados detallados de cada validador.
- Motivo de cada descarte.
- Score, desglose y versión de la rúbrica.
- Decisión editorial y usuario que la tomó.
- Versión del contrato exportado y del validador.

Los rechazados no se mezclan con el banco jugable, pero se conservan para depurar prompts, medir tasas de supervivencia y evitar repetir errores.

## Contrato de exportación

`export-approved.ts` transforma el modelo interno del generador en el formato que el juego necesita. El paquete exportado no incluye candidatos, prompts, explicaciones internas ni dependencias del generador.

```json
{
  "content_version": "2026.08.29.1",
  "validator_version": "metric-0.1.0",
  "challenges": [
    {
      "id": "reto-0007",
      "verses": ["...", "...", "...", "..."],
      "hidden_position": 2,
      "correct_answers": ["juego"],
      "distractors": ["ruego"],
      "rhyme_scheme": "-A-A",
      "skill": "rima_consonante",
      "level": 2,
      "status": "APROBADO"
    }
  ]
}
```

El juego debe rechazar el paquete si no cumple el esquema, si contiene un estado distinto de `APROBADO` o si su versión de contrato no es compatible.

## Orden recomendado de implementación

1. Crear el contrato y los JSON Schema compartidos.
2. Separar físicamente `Game` y `QuatrainGenerator`.
3. Crear el diccionario mínimo y los tests de rima.
4. Implementar `validate-batch` con validadores duros y motivos de rechazo.
5. Implementar `score-batch` con desglose y umbral configurable.
6. Implementar la skill para orquestar un lote completo.
7. Implementar `export-approved` y cargar el primer paquete en `Game`.
8. Construir el prototipo móvil usando únicamente ese paquete estático.

Esta secuencia permite probar el generador sin esperar a tener el juego terminado y probar el juego con contenido fijo sin depender del generador.
