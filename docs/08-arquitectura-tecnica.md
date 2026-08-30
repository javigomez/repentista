# Arquitectura técnica

## Separación de productos y carpetas

La separación física recomendada es:

```text
Game/                # producto móvil y contenido estático publicado
QuatrainGenerator/   # herramienta de autoría, QA y exportación
docs/                # especificaciones compartidas
```

### `QuatrainGenerator`

Aplicación de autoría y QA para crear el banco de contenido. Puede usar modelos de IA, pero la aceptación depende de validadores deterministas, puntuación trazable y revisión editorial. Incluye la skill `generate-quatrains`, que orquesta lotes y llama a scripts ejecutables.

### `Game`

Cliente ligero que carga retos `APROBADOS` desde un paquete estático, presenta opciones, registra respuestas, calcula puntuación y persiste el estado del jugador. No contiene el generador, el diccionario editorial completo ni los validadores de autoría.

## Componentes de `QuatrainGenerator`

1. **Planner**: tema, objetivo pedagógico, tono, nivel, esquema, concepto final y familia de rima.
2. **Word bank**: diccionario, fonética, tonicidad, categorías, emojis y relaciones precalculadas.
3. **Writer**: variantes construidas desde las palabras finales.
4. **Metric validator**: octoñol y escansión.
5. **Rhyme validator**: consonancia/asonancia desde la última vocal tónica.
6. **Lexical validator**: diccionario, tonicidad y vocabulario.
7. **Naturalness/rhythm validator**: fluidez y cantabilidad.
8. **Ripio detector**: penalización o rechazo de causalidad forzada.
9. **Ambiguity checker**: enumeración de respuestas posibles.
10. **Repetition checker**: similitud contra el banco histórico.
11. **Batch orchestrator**: coordinación de generación, validación, puntuación y selección.
12. **Scorer**: score de calidad de 0 a 100 con desglose y versión de rúbrica.
13. **Editor/QA**: revisión y decisión final.
14. **Exporter**: transformación al contrato estático consumido por `Game`.
15. **Content bank**: almacenamiento separado de candidatos, rechazados y aprobados.

## Componentes del juego

1. Cargador de contenido.
2. Motor de sesión y reanudación.
3. Render de cuarteta y botones.
4. Motor de respuesta y puntuación.
5. Perfil de habilidades.
6. Autosave local o remoto.
7. Selector adaptativo de retos.

## Contrato entre generador y juego

El juego debe poder funcionar sin conocer reglas lingüísticas complejas. Consume un paquete exportado que contiene:

- texto de versos;
- posición oculta;
- respuestas correctas y alternativas;
- distractores;
- esquema y metadatos de nivel;
- información de feedback;
- identificador y versión del contenido.

No consume candidatos sin validar, explicaciones internas de la IA ni contenido con `estado_qa` distinto de `APROBADO`.

El exportador debe validar el paquete final antes de escribirlo y el juego debe comprobar `content_version`, esquema y estado `APROBADO` al cargarlo.

## Flujo de ejecución del generador

```text
skill generate-quatrains
  → genera lote estructurado
  → scripts/validate-batch
  → scripts/score-batch
  → scripts/find-ambiguities y check-repetition
  → revisión editorial
  → scripts/export-approved
  → Game/data/challenges
```

El generador se ejecuta durante la creación o actualización del contenido. El juego solo ejecuta su propio runtime y nunca necesita repetir este flujo.

## Orden recomendado de implementación

1. Separar `Game` y `QuatrainGenerator`.
2. Formalizar el contrato de exportación y los JSON Schema.
3. Crear diccionario mínimo y tests de rima.
4. Implementar validador métrico conservador.
5. Implementar `validate-batch` con informes de rechazo.
6. Implementar `score-batch` con umbral configurable.
7. Construir la skill de generación y orquestación por lotes.
8. Implementar `export-approved` y un banco estático de prueba.
9. Construir un prototipo del juego con niveles 1–2.
10. Añadir autosave, puntuación y reanudación.
11. Extender QA de ambigüedad, ripio y repetición.
12. Extender progresión y modo de producción.

## Nota sobre el estado actual

El repositorio contiene actualmente un esqueleto TypeScript mínimo. Estos documentos describen el diseño objetivo; no implican que los módulos estén ya implementados.
