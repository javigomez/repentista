# Motor generador de cuartetas

## Objetivo

Generar cuartetas en castellano con tema definido, vocabulario cotidiano, octoñol, rima consonante, esquema inicial `0-A-0-A`, naturalidad, ausencia de ripio y potencial de humor o giro. La salida no son cuatro strings sueltos: es un objeto certificado o rechazado.

## Plantilla intermedia

```yaml
tema: "metáfora"
objetivo_pedagogico: "comprender metáfora"
tono: "absurdo y humorístico"
esquema: "-A-A"
tipo_reto: "preparar_rima"

v1:
  funcion: "presentacion"
  palabra_final: null
v2:
  funcion: "preparacion"
  palabra_final: null
v3:
  funcion: "giro_o_tension"
  palabra_final: null
v4:
  funcion: "remate"
  palabra_final: null
```

En la primera versión, solo se usa `0-A-0-A`: V2 y V4 comparten la familia de rima `A`; V1 y V3 no tienen rima obligatoria.

## Regla maestra

> Nunca escribas la cuarteta de izquierda a derecha.

Orden obligatorio:

1. Definir qué se quiere decir al final.
2. Elegir la palabra final del remate por sentido, no solo por rima.
3. Buscar su familia de rima en el diccionario aprobado.
4. Elegir la palabra pareja del verso 2 o de la posición correspondiente.
5. Construir V4 desde su palabra final.
6. Construir V2 desde su palabra final para preparar V4.
7. Construir V1 y V3 para introducir escena, información, tensión o giro.
8. Validar cada verso y después la cuarteta completa.
9. Buscar respuestas alternativas válidas.
10. Generar distractores y guardar el objeto en el banco solo si supera QA.

## Funciones de los versos

- **V1 — Presentación/imagen:** introduce escena, información, imagen o conflicto. Se penalizan muletillas vacías aunque midan bien.
- **V2 — Preparación:** coloca la palabra que prepara la rima y crea expectativa hacia V4.
- **V3 — Giro/tensión:** conecta V2 con V4, aumenta tensión o introduce contraste.
- **V4 — Remate:** resuelve, sorprende, hace una imagen o produce humor.

Cada verso debe tener una función declarada antes de redactarse. Ejemplos de secuencias: `PRESENTACIÓN → PREPARACIÓN → GIRO → REMATE` o `IMAGEN → COMPARACIÓN → ACLARACIÓN → CONCEPTO`.

## Biblioteca de estructuras

Se almacenan patrones sintácticos, no muletillas completas:

```text
[SUJETO] + [VERBO] + [COMPLEMENTO]
SI + [CONDICIÓN], + [RESULTADO]
CUANDO + [ACCIÓN], + [CONSECUENCIA]
NO ES + [X], + ES + [Y]
[OBJETO] + PARECE + [METÁFORA]
```

También pueden guardarse perfiles prosódicos preferidos: `2+2+3`, `3+2+2`, `4+3`, `2+3+2`. Son moldes de fluidez, no reglas rígidas.

## Generación por lotes y umbral de calidad

El sistema no pide un candidato único. La skill de autoría acepta el tamaño del lote, el umbral mínimo y el número de resultados que se quieren recuperar:

```text
100 candidatos
  → contrato y estructura
  → validadores duros
  → ambigüedad, duplicados y repetición
  → puntuación de calidad
  → score ≥ 80
  → ranking
  → top 5 para QA editorial
```

Los validadores deben devolver resultados explicables y los descartes deben conservarse en el lote. La puntuación ordena los candidatos válidos; no puede convertir en válido un candidato que falla métrica, rima o léxico.

## Módulos del generador

```text
PLANNER
  elige tema, concepto, remate y palabras finales
        ↓
WRITER
  genera variantes de versos desde las palabras finales
        ↓
VALIDATORS
  métrica · rima · diccionario · vocabulario · naturalidad · ripio · ambigüedad
        ↓
SCORER
  puntúa solo supervivientes y aplica el umbral
        ↓
EDITOR / QA
  selecciona y aprueba
        ↓
EXPORTER
  crea el paquete estático para Game
```

La skill `generate-quatrains` coordina estos pasos y llama a los scripts de validación, puntuación, control de repetición y exportación. Los scripts son la implementación ejecutable de las reglas; la skill no debe declarar por sí sola que una cuarteta es válida.

## Salida mínima del generador

```json
{
  "theme": "metáfora",
  "skill": "comprender metáfora",
  "scheme": "-A-A",
  "planning": {
    "final_concept": "pasión",
    "v4_target": "fuego",
    "v2_rhyme": "juego"
  },
  "verses": [{"text": "...", "role": "..."}],
  "rhyme_validation": {},
  "metric_validation": {},
  "correct_answers": ["juego"],
  "distractors": [],
  "quality": {
    "score": 88,
    "ripio": false,
    "naturalness": 9
  }
}
```

## Persistencia de candidatos y publicación

El generador separa tres destinos:

- `candidates/`: lotes recién generados y todavía en proceso.
- `rejected/`: candidatos descartados con sus resultados y motivos.
- `approved/`: fuente editorial de los retos aprobados.

El exportador crea una copia de solo lectura para `Game/data/challenges/`. El juego no lee `candidates/`, `rejected/` ni `approved/` directamente y no conoce el pipeline interno.

## Restricción editorial central

La métrica y la rima son restricciones; el sentido manda sobre ambas. Si un verso deja de sonar como castellano natural para cumplir una restricción, se genera otro.
