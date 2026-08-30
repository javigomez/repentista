# Validadores y control de calidad

## Pipeline de publicación

```text
GENERACIÓN DE LOTE → VALIDACIÓN → PUNTUACIÓN → EDICIÓN/QA → EXPORTACIÓN → PUBLICACIÓN
```

La IA es autora asistida, no árbitro de sus propios errores. Los estados `DUDOSO` e `INVÁLIDO` nunca llegan al jugador.

La validación y la puntuación tienen funciones diferentes. La validación aplica bloqueos objetivos y produce razones de rechazo. El puntuador compara la calidad de los candidatos que ya han sobrevivido; no puede rescatar un candidato que falla una regla obligatoria.

## Validador de octoñol

Para cada verso:

1. Separar sílabas léxicas.
2. Identificar diptongos normales.
3. Localizar la sílaba tónica de cada palabra.
4. Encontrar la última sílaba tónica del verso.
5. Aplicar solo sinalefas naturales autorizadas.
6. Contar posiciones métricas hasta la última tónica.
7. Exigir exactamente `7`.

Salida recomendada:

```yaml
resultado: "VALIDO"
segmentacion: "que-da_us-ted_re-te-NI-do"
ultima_tonica: "NI"
silabas_hasta_tonica: 7
silabas_foneticas_aprox: 8
sinalefas_detectadas: ["da_us"]
tipo_final: "LLANA"
confianza: "ALTA"
```

Si requiere una sinalefa discutible, una pronunciación anómala o una defensa teórica, devolver `DUDOSO` o `INVÁLIDO` y pedir reescritura.

## Licencias inicialmente permitidas y prohibidas

Permitidas:

- Diptongos normales del castellano.
- Sinalefa habitual y natural al hablar.
- Finales agudos y llanos.

Prohibidas inicialmente:

- Diéresis poética.
- Sinéresis buscada.
- Hiato artificial.
- Pronunciaciones forzadas.
- Sinalefas discutibles necesarias para cuadrar.

Prueba editorial:

> Si hay que defender por qué mide bien, no sirve.

## Validador de rima

Debe trabajar con la secuencia fonética desde la última vocal tónica, no con las últimas letras.

```text
ratón  → ón
dragón → ón
consonante: válido

rima   → ima
encina → ina
consonante: inválido
asonante i-a: válido solo si el reto lo permite
```

El esquema del reto determina si se exige consonancia o se permite asonancia. En la primera versión de juego se prioriza la consonante.

## Validador léxico

Comprueba:

- Que cada palabra objetivo y palabra final esté en el diccionario aprobado.
- Que tonicidad y categoría estén disponibles.
- Que el nivel de vocabulario sea compatible con el nivel del reto.
- Que los emojis usados tengan la claridad mínima requerida.

## Detector de ripio

Pregunta editorialmente:

> Si elimino la necesidad de rimar, ¿seguiría diciendo esta frase así?

Ejemplo aceptable si tiene sentido:

```text
Subí deprisa al tejado
porque estaba muy mojado
```

Ejemplo rechazable aunque rime:

```text
El dragón estaba sentado
porque era bastante cuadrado
```

La respuesta formal no compensa una relación semántica inventada para cerrar la rima.

## Validador de naturalidad y cantabilidad

Debe comprobar que el verso se puede pronunciar fluidamente sobre un patrón con el séptimo golpe tónico:

```text
ta-ta-ta-ta-ta-ta-TÁ-ta  (final llano)
ta-ta-ta-ta-ta-ta-TÁ      (final agudo)
```

El componente puede guardar perfiles preferidos `2+2+3`, `3+2+2`, `4+3` y `2+3+2`, sin hacerlos obligatorios.

## Ambigüedad y unicidad

Antes de publicar un reto, buscar todas las palabras del diccionario que:

1. Rimen correctamente.
2. Encajen gramaticalmente.
3. Tengan sentido razonable en el contexto.

Si solo queda una, guardar esa palabra en `correct_answers`. Si aparecen dos como `juego` y `ruego`, por defecto se reescribe el verso para hacerlo inequívoco. Alternativamente, se pueden aceptar ambas de forma explícita.

## Control de repetición

Comparar contra el historial del banco y regenerar si la similitud es demasiado alta. Evitar:

- La misma pareja de rimas.
- La misma estructura sintáctica.
- El mismo personaje.
- El mismo chiste.
- Los mismos verbos.
- Un exceso de participios.

## Scoring técnico de publicación

El score se calcula sobre los candidatos válidos y sirve para filtrar y ordenar lotes. Por ejemplo, con 100 candidatos generados, pueden descartarse 50 durante la validación y devolverse solo los 5 supervivientes con score igual o superior a `80/100`.

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

Bloqueos inmediatos:

- Métrica incorrecta → descartar.
- Rima incorrecta → descartar.
- Palabra fuera del diccionario → descartar.

Umbral inicial sugerido: `≥80/100`, sujeto a calibración editorial.

El resultado del puntuador debe incluir el desglose por dimensión, la versión de la rúbrica y una explicación breve. Las dimensiones subjetivas, como humor u originalidad, pueden recibir asistencia de IA, pero requieren trazabilidad y revisión editorial antes de publicar.

## Ejecución de scripts

Los validadores deben poder ejecutarse fuera del juego y de forma reproducible:

```text
validate-batch <batch.json> --dictionary <version>
score-batch <validated.json> --threshold 80
find-ambiguities <validated.json>
check-repetition <validated.json> --bank <approved>
export-approved <selected.json> --out <Game/data/challenges>
```

Los nombres son orientativos. Cada script debe devolver código de salida no satisfactorio cuando no pueda producir un resultado confiable y guardar un informe estructurado, no solo texto para la consola.
