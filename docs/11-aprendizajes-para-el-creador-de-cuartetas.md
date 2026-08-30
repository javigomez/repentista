# Aprendizajes para el creador de cuartetas

Este documento resume lo aprendido al revisar generadores de poesía, analizadores de métrica y corpus de poesía en español. No propone copiar un proyecto completo: identifica qué piezas podemos reutilizar, qué patrones arquitectónicos funcionan y cómo aprovechar un LLM sin convertirlo en el árbitro de sus propios errores.

## Conclusión ejecutiva

No hemos encontrado un generador abierto que resuelva exactamente nuestro producto: cuartetas humorísticas en castellano, pensadas para un juego, con vocabulario editorial, respuestas únicas y certificación antes de publicar.

Sí existe una combinación madura de ideas:

```text
PoeTryMe / WASP       → arquitectura de generación y composición
silabacion            → sílabas, tonicidad y terminación rimante en TypeScript
Rantanplan            → escansión y comprobación externa durante la autoría
RhymeTagger           → análisis estadístico de rimas y corpus
PoeTree / DISCO       → datos para estudiar estructuras y vocabulario
PoeLM                 → generación controlada y filtrado de muchos candidatos
```

La decisión recomendada para Repentista es:

1. Mantener un núcleo determinista propio para el octoñol, la rima aprobada, el diccionario y la unicidad de respuestas.
2. Usar el LLM como planificador, redactor de variantes, crítico de naturalidad y ayudante de reparación.
3. Generar muchos candidatos baratos y conservar solo los que sobrevivan a los validadores.
4. Separar completamente la creación de contenido del juego.
5. Hacer que una persona pueda entender por qué cada candidato fue aceptado o rechazado.

La parte difícil y diferencial no es contar sílabas aisladas. Es coordinar sentido, humor, remate, rima, métrica, vocabulario infantil, aprendizaje y ausencia de respuestas alternativas.

## 1. Qué proyectos hemos encontrado y qué enseñan

### 1.1. Generador de décimas con plantillas y palabras seleccionadas

El trabajo [Generador de décimas](https://diseno.uc.cl/memorias/pdf/memoria_dno_uc_2017_2_PAVEZ_RAMIREZ_S.pdf) describe una aplicación que genera décimas a partir de bases de palabras y estructuras en JavaScript. La combinación produce muchas posibilidades, pero mantiene la rima y el número de sílabas exigidos por la forma.

Es el precedente más cercano a nuestro enfoque de diccionario editorial y plantillas. La lección útil no es el código concreto, sino el modelo:

- las palabras se agrupan por función y posición;
- las plantillas reducen el espacio de búsqueda;
- la aleatoriedad sirve para explorar variantes, no para decidir si una variante es buena;
- las reglas formales deben comprobarse después de rellenar la plantilla.

La limitación que debemos evitar es producir frases formalmente correctas pero semánticamente pobres. En Repentista, cada verso debe tener una función narrativa y la cuarteta debe tener un remate reconocible.

### 1.2. Kobra17: plantillas gramaticales sencillas

El artículo [Poesía Automática](https://kobra17.com/poesia-automatica/) explica un generador JavaScript basado en plantillas y listas de palabras etiquetadas por categoría gramatical. Es valioso porque muestra la versión mínima viable del problema: rellenar huecos con piezas compatibles.

También documenta el problema central: unir versos independientes no garantiza que exista un poema con sentido. Para nosotros esto confirma que la plantilla debe representar algo más que una secuencia gramatical:

```text
V1: presenta una escena
V2: prepara una expectativa
V3: cambia o tensa la situación
V4: remata y resuelve
```

Una plantilla de Repentista debería declarar los slots semánticos, gramaticales, métricos y rimantes, no solo una lista de números.

### 1.3. PoeTryMe: generación modular y co-creativa

[PoeTryMe](https://poetryme.dei.uc.pt/) separa una red semántica, una gramática de plantillas, un generador de frases, operaciones silábicas y un contextualizador que puede explicar las elecciones. Además fue adaptado para generar poesía en español.

Sus ideas más transferibles son:

- el tema no se representa como un prompt libre, sino como un dominio semántico;
- una forma poética es una configuración, no una instrucción informal;
- las plantillas expresan relaciones semánticas y no solo sintaxis;
- el sistema puede generar palabras, versos o poemas en distintos niveles de interacción;
- la explicación de una elección ayuda al autor a revisar y corregir.

Esto respalda la separación que ya hemos propuesto entre `Planner`, `Writer`, validadores y editor. También sugiere que el generador debería poder trabajar en modo asistido: mostrar primero palabras finales, después versos candidatos y finalmente cuartetas.

### 1.4. WASP: restricciones, población de borradores y jueces

[WASP](https://www.poetryinternational.com/en/poets-poems/poets/poet/102-29450_WASP), desarrollado por Pablo Gervás, es un sistema de generación formal de poesía en español. La documentación y los trabajos publicados sobre el sistema describen una combinación de patrones de verso, rima, métrica, generación de borradores, jueces y revisores.

La enseñanza principal es arquitectónica: la generación de poesía funciona mejor como una población de borradores sometida a operaciones de evaluación y revisión que como una única llamada que devuelve un poema final.

Para Repentista, esto se traduce en:

```text
brief → muchos planes → muchos versos → validación → poda
      → ranking → reparaciones → revisión editorial
```

No necesitamos reproducir la complejidad de WASP. Sí necesitamos conservar la idea de que escribir, juzgar y revisar son responsabilidades distintas.

### 1.5. Rantanplan: análisis profundo de poesía española

[Rantanplan](https://github.com/linhd-postdata/rantanplan) es una biblioteca Python con licencia Apache 2.0. Analiza sílabas, tonicidad, fenómenos como sinalefa y sinéresis, longitud métrica, ritmo, rima y tipos de estrofa; declara soporte para decenas de formas españolas.

Es una buena herramienta de contraste durante la autoría, pero no debe definir por sí sola nuestro producto:

- su objetivo es describir poesía española general;
- Repentista impone una política más conservadora;
- nuestro criterio es contar siete posiciones hasta la última sílaba tónica;
- una escansión aceptada por una biblioteca general puede ser demasiado permisiva para un reto infantil;
- la detección de rima de una estrofa existente no equivale a certificar que una respuesta sea única.

Recomendación: usar Rantanplan como segundo comprobador en el pipeline de autoría y como fuente de casos de prueba, pero conservar un `metric-validator` propio y pequeño para el contrato de Repentista.

### 1.6. `silabacion`: una pieza directamente integrable

El repositorio [silabacion](https://github.com/weiwei/silabacion) es una biblioteca TypeScript/JavaScript con licencia MIT. Expone separación silábica, posición tónica, diptongos, hiatos y una terminación rimante para palabras.

Es la candidata más natural para el primer prototipo porque el repositorio actual ya está en TypeScript. Aun así, hay que envolverla con nuestros propios tipos y pruebas: el resultado de una biblioteca de palabras no es todavía un contador de métrica poética de verso completo.

La capa propia debería convertir su información en algo como:

```ts
type WordAnalysis = {
  text: string;
  syllables: string[];
  stressedIndex: number;
  stressType: "aguda" | "llana" | "esdrujula";
  rhymeTail: string;
};

type VerseMetric = {
  positionsToLastStress: number;
  phoneticSyllables: number;
  sinalefas: Sinalefa[];
  finalStressType: "aguda" | "llana" | "esdrujula";
  confidence: "alta" | "media" | "baja";
};
```

### 1.7. `jsilabeador` y `silabeador`: útiles, pero con cuidado de licencia

[jsilabeador](https://github.com/jdevera/jsilabeador) es un port JavaScript sin dependencias de `pylabeador` y está contrastado contra sus pruebas. Sin embargo, el repositorio declara GPL-3.0-or-later. [silabeador](https://github.com/fsanzl/silabeador) es Python y declara LGPL-2.1.

Para un producto que pudiéramos distribuir con una licencia propia, `silabacion` MIT es una primera opción jurídicamente más sencilla. No se debe incorporar código GPL ni datos de un corpus sin revisar antes el efecto de la licencia sobre el producto final.

### 1.8. RhymeTagger: rima estadística, no árbitro editorial

[RhymeTagger](https://github.com/versotym/rhymetagger) reconoce esquemas de rima y ofrece un modelo español entrenado sobre PoeTree. Trabaja con información fonética y también permite entrenar modelos propios.

Puede ayudarnos a:

- descubrir familias de rima en un corpus;
- comparar si una pareja suena natural en poesía real;
- analizar el banco histórico;
- sugerir palabras que el diccionario editorial todavía no contiene.

No debería decidir automáticamente que una pareja es jugable. El producto necesita una lista aprobada, con palabras cotidianas, categoría gramatical, emoji, nivel y sentido compatible con el reto.

### 1.9. PoeLM: control de forma mediante datos y filtrado

[PoeLM](https://github.com/aitorormazabal/poetry_generation) acompaña un trabajo de investigación sobre generación controlable por métrica y rima. Su planteamiento usa descriptores de estructura, genera con un modelo de lenguaje y filtra o reordena los candidatos. El trabajo experimenta con español y euskera.

La idea importante para nosotros es el filtrado posterior y el ranking de múltiples candidatos. No necesitamos empezar entrenando un Transformer propio. Podemos aplicar el patrón con un LLM externo:

```text
LLM genera 50 variantes
→ validador de métrica y rima elimina las imposibles
→ validadores léxicos eliminan las no publicables
→ LLM puntúa coherencia y humor de las supervivientes
→ editor elige las mejores
```

### 1.10. Corpus: DISCO, PoeTree y otras colecciones

[DISCO](https://github.com/pruizf/disco) es un corpus de sonetos españoles con anotaciones de métrica y rima, disponible bajo CC-BY. [PoeTree](https://github.com/versotym/poetree) ofrece acceso a corpus de poesía multilingües, incluyendo un corpus español.

Estos recursos son buenos para investigación, extracción de patrones, pruebas y análisis estadístico. No deben convertirse automáticamente en contenido del juego:

- los corpus tienen procedencias y condiciones distintas;
- la poesía de dominio público no implica que todas las ediciones digitales lo sean;
- copiar frases o usar un corpus para entrenar un modelo requiere revisar derechos y atribución;
- el estilo de un corpus culto no coincide necesariamente con el vocabulario infantil y humorístico del juego.

## 2. La arquitectura que se desprende de todo ello

### 2.1. Principio de doble núcleo

El sistema debe tener dos núcleos con responsabilidades incompatibles:

```text
Núcleo creativo                         Núcleo de certificación
────────────────                         ───────────────────────
LLM, plantillas, búsqueda,             reglas deterministas,
semántica, humor, reescritura          diccionario, rima, métrica,
                                       ambigüedad y contrato
```

El núcleo creativo puede ser probabilístico y caro. El núcleo de certificación debe ser reproducible: mismo candidato, misma versión y misma decisión.

### 2.2. Pipeline recomendado

```text
BRIEF EDITORIAL
  ↓
PLANIFICADOR
  tema, objetivo, escena, giro, remate, esquema y familia de rima
  ↓
SELECCIÓN DE PALABRAS FINALES
  palabra de remate → pareja rimante → restricciones gramaticales
  ↓
GENERACIÓN DE CANDIDATOS
  versos escritos desde el final, no de izquierda a derecha
  ↓
VALIDADORES DUROS
  esquema, métrica, rima, diccionario, estructura, seguridad
  ↓
VALIDADORES BLANDOS
  naturalidad, humor, coherencia, ripio, cantabilidad, variedad
  ↓
REPARACIÓN LIMITADA
  reescribir únicamente el verso o defecto afectado
  ↓
DESAMBIGUACIÓN Y RANKING
  respuestas posibles, repetición, calidad y diversidad
  ↓
REVISIÓN HUMANA
  decisión editorial trazable
  ↓
EXPORTACIÓN
  solo retos `APROBADO` hacia el juego
```

### 2.3. Esquemas formales del producto

El primer producto debe admitir una única configuración explícita:

```yaml
schemes:
  - id: "0-A-0-A"
    rhyme_positions: [null, "A", null, "A"]
```

`0` significa que no se exige una pareja de rima en esa posición. No significa que el verso sea libre de cualquier otra restricción.

La métrica de cada verso es:

```yaml
metric:
  positions_to_last_stress: 7
  final_words_allowed: ["aguda", "llana"]
  allow_dieresis: false
  allow_sineresis: false
  allow_forced_hiatus: false
  sinalefa_policy: "natural-conservative"
```

El validador debe informar tanto de las posiciones hasta la última tónica como de la segmentación que ha utilizado. Si necesita una decisión dudosa para llegar a siete, el resultado es `DUDOSO`, no `VALIDO`.

### 2.4. Planificación desde el remate

Los sistemas revisados confirman que la rima se controla mejor cuando se decide pronto. Para una cuarteta:

1. Declarar qué debe entender o sentir el jugador.
2. Definir la escena y el remate.
3. Elegir la palabra final de V4 por sentido.
4. Buscar una familia de rima aprobada.
5. Elegir la palabra final de V2 dentro de la misma familia que V4.
6. Construir esos versos desde la palabra final hacia atrás.
7. Escribir los versos de presentación y giro alrededor de lo ya fijado.
8. Validar y generar alternativas.

Esto reduce la probabilidad de que el LLM llegue al último verso con una frase bonita pero una palabra final imposible.

## 3. Cómo sacar partido de un LLM sin delegarle lo que no debe hacer

### 3.0. Sustituir la respuesta monolítica por un proceso incremental

La intuición de que una respuesta corta y exacta puede ser difícil para un modelo es válida para este problema. Pedir:

```text
Genera ahora una cuarteta perfecta sobre el egoísmo.
```

obliga al modelo a resolver a la vez el sentido, el remate, la elección de rimas, la métrica, la sintaxis, el humor y la unicidad de la respuesta. Una salida plausible no demuestra que todas esas restricciones se hayan cumplido.

La solución no es pedir una cadena de pensamiento privada cada vez más larga. Es diseñar un flujo externo que divida el trabajo en estados, conserve los resultados y valide cada transición. El modelo puede devolver un resumen operativo breve y estructurado; no necesitamos almacenar ni depender de todo su razonamiento interno.

El flujo inicial debe ser:

```text
CONTEXTO
  ↓
PLAN SEMÁNTICO
  qué se quiere decir, qué se aprenderá y cuál será el giro
  ↓
REMATE
  concepto final y palabra final de V4
  ↓
FAMILIA DE RIMA
  familia aprobada y palabra final de V2
  ↓
ANCLAS SEMÁNTICAS
  imágenes, personajes, relaciones y vocabulario permitido
  ↓
PRESUPUESTOS MÉTRICOS
  qué debe completar cada verso hasta siete posiciones
  ↓
VERSOS, UNO A UNO
  propuesta → validación → aceptación o reparación
  ↓
CUARTETA
  coherencia, humor, ripio, ambigüedad y ranking
```

Para el primer alcance solo se permite `0-A-0-A` (`-A-A`): V2 y V4 comparten una familia consonante; V1 y V3 no tienen rima obligatoria. No debemos hacer que el modelo planifique dos familias hasta que este flujo esté estable.

### 3.0.1. Ejemplo de estados con el contexto del egoísmo

El siguiente proceso es una guía de trabajo, no texto que debamos pedir literalmente al modelo en una sola llamada:

```text
Contexto:
  El egoísmo puede hacerte perder las amistades.

Estado 1 — Plan semántico:
  Idea: quien nunca comparte acaba aislado.
  Recurso: metáfora de un árbol sin frutos.
  Remate: convertir "tener algo que dar" en la condición para conservar amigos.

Estado 2 — Palabra final del remate:
  elegir "dar" para V4 porque expresa la idea final.

Estado 3 — Familia de rima:
  analizar "dar" → familia consonante "-ar".
  consultar el diccionario aprobado.
  elegir "considerar" para V2 por sentido y porque pertenece a la familia.

Estado 4 — Anclas:
  V1: árbol sin frutos.
  V3: pocos amigos.
  V4: no tener nada que dar.

Estado 5 — Presupuestos:
  dar es aguda: el verso debe llegar a siete posiciones hasta "dar".
  considerar es aguda: el verso debe llegar a siete posiciones hasta "rar".
  el modelo puede proponer presupuestos, pero el código los recalcula.

Estado 6 — V1:
  "En el pie de un árbol sin frutos" → inválido: supera el objetivo.
  Reparación: "Al pie de un árbol sin frutos" → válido.

Estado 7 — V2:
  "Me puse a considerar" → válido y contiene la palabra final prevista.

Estado 8 — V3:
  "Qué pocos amigos tiene" → válido y desarrolla la idea.

Estado 9 — V4:
  "El que no tiene que dar" → válido, remata y rima con V2.
```

El detalle importante es que cada paso produce un artefacto que se puede comprobar. El LLM no tiene que recordar de forma fiable todos los pasos anteriores ni adivinar si una frase mide bien: recibe el estado actual y las restricciones que siguen vivas.

### 3.0.2. Máquina de estados del orquestador

El agente de autoría debería tener estados explícitos y transiciones limitadas:

```text
BRIEF_RECEIVED
  → PLAN_READY
  → REMATE_SELECTED
  → RHYME_PAIR_SELECTED
  → ANCHORS_READY
  → METRIC_BUDGETS_READY
  → V1_VALID
  → V2_VALID
  → V3_VALID
  → V4_VALID
  → QUATRAIN_VALID
  → SOFT_SCORED
  → EDITOR_REVIEW
  → APPROVED | REJECTED
```

Cada estado debe tener:

- un esquema de entrada;
- una operación permitida;
- una validación de salida;
- un número máximo de reintentos;
- un motivo de fallo legible;
- una transición siguiente.

Por ejemplo, `RHYME_PAIR_SELECTED` no puede avanzar si la palabra de V2 no está en el diccionario, no rima consonantemente con V4 o no tiene una relación semántica razonable con el contexto.

### 3.0.3. Herramientas que debe poder consultar el LLM

En vez de pedirle que haga cálculos mentalmente, el orquestador puede exponer herramientas pequeñas. Sus nombres son conceptuales y pueden implementarse como funciones TypeScript:

```text
lookupWord(word)
findApprovedRhymes(word, constraints)
analyzeWord(word)
calculateMetricBudget(finalWord, targetPositions)
validateVerse(text, constraints)
validateRhymeScheme(verses, scheme)
findPossibleAnswers(verse, dictionary)
searchSimilarApprovedContent(text)
```

El modelo decide qué información necesita y el código devuelve datos verificables. Una secuencia típica sería:

```text
LLM: necesito familias para "dar"
Tool: { family: "ar", candidates: [...] }
LLM: elijo "considerar" por sentido
Tool: { rhyme: "VALIDO", lexical: "VALIDO" }
LLM: propongo V2
Tool: { metric: "VALIDO", positions: 7 }
```

El modelo sigue siendo útil para decidir entre alternativas y expresar sentido; las herramientas son las que garantizan la aritmética lingüística.

### 3.0.4. Presupuestos métricos como ayudas, no como pruebas

Decir “`dar` necesita seis sílabas más” puede ayudar al modelo a redactar, pero es una aproximación. Las sinalefas, la tonicidad y la forma exacta de la frase pueden cambiar el recuento.

Por eso el proceso correcto es:

1. El código analiza la palabra final.
2. El modelo recibe un presupuesto orientativo y restricciones de colocación.
3. El modelo propone el verso.
4. El validador calcula la métrica real.
5. Si falla, el reparador recibe el diagnóstico exacto.

Nunca se debe aceptar un verso porque el modelo haya sumado bien sus palabras por separado.

### 3.0.5. Prompts por estado

Cada prompt debe pedir una sola operación y prohibir avanzar prematuramente:

```text
ESTADO: PLAN_SEMANTICO
Entrada: contexto, nivel, objetivo pedagógico, tono.
Tarea: propone una idea de cuarteta y una posible escena.
No escribas versos. No elijas todavía palabras de rima.
Devuelve JSON con idea, recurso, giro y riesgos.
```

```text
ESTADO: RHYME_PAIR
Entrada: concepto de remate, palabra final V4 y candidatos del diccionario.
Tarea: elige una palabra final para V2 de la lista recibida.
No inventes palabras. No escribas versos.
Devuelve palabra, razón semántica y advertencias.
```

```text
ESTADO: DRAFT_VERSE
Entrada: función del verso, anclas, palabra final, presupuesto y restricciones.
Tarea: escribe hasta 12 variantes de un solo verso.
No escribas la cuarteta completa. No cambies la palabra final.
Devuelve solo los candidatos estructurados.
```

```text
ESTADO: REPAIR_VERSE
Entrada: verso, diagnóstico del validador y propiedades que deben conservarse.
Tarea: corrige solo el defecto indicado.
No cambies palabras finales ni el sentido salvo que se autorice.
Devuelve variantes y no afirmes que son válidas sin volver a comprobarlas.
```

La prohibición de escribir la cuarteta completa no es una garantía suficiente por sí sola; la garantía real es que el orquestador no puede pasar de estado sin ejecutar la validación correspondiente.

### 3.1. Asignar varios papeles pequeños

Una sola petición del tipo “genera una cuarteta perfecta” mezcla demasiadas tareas. Es mejor usar llamadas especializadas:

#### Planificador

Recibe tema, nivel y objetivo pedagógico. Devuelve:

- escena concreta;
- intención de cada verso;
- concepto del remate;
- palabras finales candidatas;
- posibles giros humorísticos;
- riesgos de ambigüedad;
- vocabulario que debe evitarse.

No escribe todavía la cuarteta.

#### Generador de versos

Recibe una palabra final obligatoria, su familia de rima, la función del verso, la categoría gramatical y el objetivo semántico. Produce muchas variantes independientes.

Debe recibir los datos en forma de contrato, por ejemplo:

```json
{
  "role": "remate",
  "target_word": "fuego",
  "rhyme_family": "uego",
  "positions_to_last_stress": 7,
  "semantic_goal": "revelar que el dragón confundió pasión con una hoguera",
  "allowed_vocabulary_level": "basico",
  "banned_patterns": ["relleno", "frase hecha sin función"]
}
```

#### Crítico blando

Solo evalúa las supervivientes de los validadores duros. Debe valorar:

- si el verso suena natural;
- si la imagen se entiende;
- si hay relación causal o narrativa;
- si el remate sorprende;
- si la rima parece buscada a la fuerza;
- si el vocabulario es adecuado para la edad.

Debe devolver razones observables, no solo una nota.

#### Reparador

Recibe el texto, el defecto exacto y las restricciones que ya se cumplen. Reescribe una parte concreta sin modificar innecesariamente los demás versos.

Ejemplo:

```text
Defecto: V2 mide 8 posiciones hasta la última tónica.
Conservar: escena, palabra final "juego", tono y esquema A.
Cambiar: solo V2.
Prohibido: sinalefa discutible y palabras fuera del diccionario.
```

La reparación debe tener un número máximo de intentos. Si no funciona, se descarta el candidato y se vuelve a explorar otra rama.

#### Selector final

Compara pocas candidatas ya validadas. Es preferible pedir una comparación razonada entre cinco candidatas que una puntuación absoluta de cientos de textos. La selección del LLM sigue siendo orientativa y no sustituye al editor.

### 3.2. Darle al modelo restricciones operativas, no teoría extensa

El LLM trabaja mejor si recibe la información accionable de cada slot:

```text
qué debe decir
qué palabra debe cerrar el verso
qué categoría gramatical debe tener
qué familia de rima debe usar
qué palabras están permitidas
qué función narrativa cumple
qué defectos ya se han detectado
```

Las explicaciones generales sobre métrica española pueden acompañar al prompt, pero no deben ser la única defensa. El contrato debe expresar restricciones concretas y el código debe comprobarlas.

### 3.3. Usar ejemplos como anclas de calidad

Para naturalidad y humor, las instrucciones abstractas son insuficientes. El sistema debe mantener un pequeño conjunto de ejemplos editoriales:

- cuartetas aprobadas;
- cuartetas que riman pero contienen ripio;
- versos métricamente correctos pero antinaturales;
- casos con dos respuestas válidas;
- remates buenos y remates obvios;
- vocabulario aceptable y vocabulario demasiado culto.

Los ejemplos negativos son especialmente valiosos: enseñan al crítico qué no debe premiar.

### 3.4. Generar por lotes y explorar diversidad

La calidad de una única salida es frágil. Conviene generar un lote con variación controlada:

- cambiar la estructura sintáctica;
- cambiar el personaje o la imagen;
- cambiar la dirección del giro;
- mantener fija la palabra de remate;
- variar el ritmo interno sin relajar la métrica;
- pedir soluciones independientes, no una cadena de pequeñas modificaciones.

La cantidad no debe ser fija para siempre. Hay que medir cuántos candidatos sobreviven por tema, familia de rima y nivel. Un lote de 100 puede ser razonable para autoría, pero innecesario para una reparación.

### 3.5. Enviar al LLM el resultado de los validadores

Cuando se pida una reparación, no hay que decir simplemente “no rima”. Hay que devolver el diagnóstico:

```json
{
  "verse": "El dragón juega con fuego",
  "metric": {
    "status": "INVALIDO",
    "positions_to_last_stress": 8,
    "target": 7
  },
  "rhyme": {
    "status": "VALIDO",
    "tail": "uego"
  },
  "lexical": {
    "status": "VALIDO"
  }
}
```

Así el modelo conserva lo que ya funciona y corrige el defecto real. Esta técnica es más eficaz que regenerar la cuarteta completa cada vez.

### 3.6. Estructura de salida estricta

Cada llamada creativa debe producir un objeto validable, no prosa libre. El objeto debería incluir:

```json
{
  "candidate_id": "local-id",
  "plan_id": "plan-12",
  "verses": [
    {"text": "...", "role": "presentacion", "target_word": null},
    {"text": "...", "role": "preparacion", "target_word": "juego"},
    {"text": "...", "role": "giro", "target_word": null},
    {"text": "...", "role": "remate", "target_word": "fuego"}
  ],
  "explanation": "...",
  "warnings": []
}
```

El campo `explanation` ayuda al autor, pero nunca se toma como evidencia de que el texto es correcto. El validador vuelve a analizar siempre los versos.

### 3.7. No usar el LLM para las decisiones duras

No se debe preguntar al modelo si:

- un verso tiene siete posiciones métricas;
- una palabra rima consonantemente con otra;
- existe una segunda respuesta válida;
- una palabra pertenece al diccionario aprobado;
- un paquete exportado cumple el contrato.

El modelo puede proponer, explicar o priorizar. La decisión final debe pertenecer al código, a una enumeración del diccionario o al editor.

### 3.8. Coste, latencia y privacidad

El LLM debe usarse en la herramienta de autoría, no en el runtime del juego. Esto permite:

- generar contenido por lotes cuando el coste sea aceptable;
- almacenar resultados y no repetir llamadas;
- comparar modelos o prompts sin afectar al jugador;
- revisar qué información se envía a un proveedor;
- exportar al juego solo texto aprobado.

Conviene guardar un resumen de uso por lote: modelo, versión de prompt, número de llamadas, tokens aproximados, candidatos aceptados y coste estimado. Si el contenido incluye ideas, nombres o material de terceros, hay que revisar qué se manda al proveedor.

## 4. Validación específica de nuestras cuartetas

### 4.1. Métrica: siete posiciones hasta la última tónica

La regla del producto debe expresarse como una función pequeña y testeable:

```text
metric(verse) = número de posiciones métricas desde el inicio
                hasta la última sílaba tónica del verso

válido ⇔ metric(verse) = 7
```

El validador debe conservar un trazado de cálculo:

```yaml
result: "VALIDO"
segments: ["que", "da", "us", "te", "re", "NI", "do"]
last_stress: "NI"
positions_to_last_stress: 7
final_word: "retenido"
final_stress_type: "llana"
sinalefas: ["da_us"]
confidence: "alta"
```

No debemos aceptar automáticamente diéresis, sinéresis, hiatos fabricados ni sinalefas dudosas. Una relajación futura debe ser una decisión versionada, no una excepción silenciosa.

### 4.2. Rima: representar la parte fonética, no las letras finales

La rima consonante debe calcularse desde la última vocal tónica hasta el final fonético. El modelo editorial puede guardar:

```yaml
word: "dragón"
phonetic_rhyme_tail: "on"
stress_type: "aguda"
rhyme_family: "on"
approved_pairs: ["balcón", "ratón", "botón", "limón"]
```

La comparación ortográfica simple es insuficiente. También hay que documentar decisiones dialectales como seseo, yeísmo o equivalencias fonéticas. En la primera versión es mejor una lista aprobada pequeña que una rima “inteligente” y difícil de explicar.

### 4.3. El esquema inicial

#### `0-A-0-A`

- V1 no necesita rimar.
- V2 y V4 comparten la familia `A`.
- V3 no necesita rimar.
- Es adecuado para una copla de presentación y remate.

El editor debe poder definir la respuesta oculta y sus rimas antes de solicitar versos al LLM.

### 4.4. La unicidad es una propiedad del reto completo

No basta con que la palabra marcada sea correcta. Hay que enumerar todas las palabras del diccionario que:

1. riman con la familia exigida;
2. caben en la posición;
3. tienen la categoría gramatical adecuada;
4. producen una frase razonable;
5. no contradicen el sentido del verso.

Si quedan dos respuestas plausibles, el reto se reescribe, se acepta explícitamente más de una o se marca como no publicable. El LLM puede ayudar a descubrir candidatos, pero la comprobación debe partir de un diccionario cerrado.

## 5. Puntuación y revisión de calidad

### 5.1. Separar bloqueos de preferencias

Los bloqueos no son puntos:

```text
si falla métrica, rima, diccionario o esquema → RECHAZADO
si queda dudoso → REVISIÓN / RECHAZADO
si pasa → se puede puntuar
```

Después se puntúan dimensiones blandas:

| Dimensión | Peso inicial | Cómo evaluarla |
|---|---:|---|
| Naturalidad | 20 | ¿Lo diría así una persona? |
| Coherencia | 15 | ¿Los cuatro versos forman una escena? |
| Remate | 15 | ¿El final cambia o resuelve la expectativa? |
| Humor | 15 | ¿Hay imagen, absurdo o sorpresa comprensible? |
| Cantabilidad | 10 | ¿Se puede decir con pulso fluido? |
| Vocabulario | 10 | ¿Es claro y apropiado para el nivel? |
| Variedad | 5 | ¿Evita fórmulas repetidas? |
| Originalidad | 10 | ¿No es una copia o una combinación gastada? |
| **Total** | **100** | La rúbrica se puede recalibrar con decisiones editoriales reales. |

Estos pesos son una propuesta de trabajo, no una verdad literaria. Lo importante es que la puntuación blanda nunca compense una métrica o una rima defectuosa.

### 5.2. Cómo usar el LLM como juez

El juez debe recibir solo candidatas que hayan pasado las comprobaciones técnicas. Para obtener evaluaciones más útiles:

- usar una rúbrica concreta;
- pedir una razón breve por cada nota;
- incluir ejemplos ancla aprobados y rechazados;
- pedir comparación entre candidatas del mismo lote;
- no presentar la explicación del propio redactor como prueba;
- enviar las finalistas a una segunda evaluación o a una persona.

No conviene usar una única nota del LLM como umbral automático al principio. Primero hay que medir su correlación con decisiones editoriales.

### 5.3. Detector de ripio como tarea separada

La rima puede obligar a decir algo que nadie diría. El detector de ripio debe preguntar, explícita o implícitamente:

```text
Si eliminamos la necesidad de rimar, ¿seguiría existiendo esta frase
con esta relación de significado?
```

La respuesta del LLM puede ser útil como señal blanda, pero debe apoyarse en:

- listas de muletillas;
- patrones de causalidad absurda;
- repetición morfológica excesiva;
- comparación con ejemplos negativos;
- revisión editorial.

### 5.4. Revisar por lotes, no solo por resultado

La interfaz de autoría debería mostrar:

- candidatos supervivientes;
- motivos de descarte;
- tasa de supervivencia por validador;
- palabras finales y familias de rima usadas;
- puntuación por dimensión;
- advertencias de ambigüedad;
- similitud con contenido ya publicado.

Los descartes son datos de mejora. Si el 70 % de los candidatos falla por métrica, el problema puede estar en el prompt, en la plantilla o en la elección de palabras finales.

## 6. Evaluación continua y pruebas

### 6.1. Conjunto de oro

Hay que construir un corpus pequeño, versionado y revisado a mano con:

- versos válidos y no válidos;
- ejemplos de aguda y llana;
- sinalefas naturales y dudosas;
- rimas consonantes y asonantes;
- pares que parecen rimar por ortografía pero no por sonido;
- cuartetas con una o varias respuestas;
- ripios evidentes;
- vocabulario permitido y prohibido.

Cada cambio del validador debe ejecutarse contra este conjunto. Si cambia el resultado de una pieza, se documenta si es una mejora, una regresión o una decisión de producto.

### 6.2. Métricas del pipeline

Conviene medir al menos:

```text
generation_yield             candidatos válidos / candidatos generados
approval_rate                aprobados / candidatos generados
metric_failure_rate          fallos métricos / candidatos
rhyme_failure_rate           fallos de rima / candidatos
ambiguity_rate               retos ambiguos / retos técnicamente válidos
editorial_acceptance_rate    aprobados por editor / top-K presentado
duplicate_rate               duplicados o casi duplicados / lote
cost_per_approved_challenge coste total / reto aprobado
repair_success_rate          reparaciones válidas / reparaciones intentadas
```

Estas métricas permiten elegir entre mejorar prompts, diccionario, plantillas o validadores con datos reales.

### 6.3. Pruebas de regresión del juego

El juego debe probar que:

- solo carga `APROBADO`;
- acepta todas las respuestas correctas declaradas;
- no acepta distractores;
- conserva la posición oculta;
- entiende la versión del contrato;
- puede funcionar sin el LLM y sin el diccionario completo.

## 7. Reutilización concreta recomendada

### Reutilizar directamente o como dependencia candidata

| Pieza | Uso recomendado | Riesgo o límite |
|---|---|---|
| `silabacion` | análisis de palabras en TypeScript | requiere construir el análisis de verso |
| Rantanplan | QA externo y casos de prueba | Python y reglas más generales que el octoñol |
| RhymeTagger | análisis exploratorio de rimas | modelo estadístico, no banco editorial |
| DISCO | corpus anotado para investigación | atribución y alcance de los textos |
| PoeTree | estadísticas y acceso a corpus | procedencia y licencias de fuentes variadas |

### Usar como inspiración, no como dependencia inicial

| Proyecto | Aprendizaje |
|---|---|
| PoeTryMe | red semántica + gramática + generación por niveles |
| WASP | población de borradores + jueces + revisores |
| PoeLM | descriptores de forma + generación múltiple + filtrado |
| Generador de décimas | bases de palabras y plantillas en JavaScript |
| Kobra17 | prototipo mínimo de plantillas gramaticales |

### Evitar hasta revisar jurídicamente

- `jsilabeador`, por su licencia GPL-3.0-or-later;
- `pylabeador`, por su licencia GPL-3.0;
- `PoesIA`, por su licencia GPL-3.0 y porque su objetivo es generar poesía libre mediante RNN, no certificar retos;
- cualquier corpus o modelo cuyos datos de entrenamiento, licencia y procedencia no estén claros.

## 8. Propuesta de implementación en nuestro repositorio

### Fase 1: núcleo formal pequeño

1. Integrar una capa abstracta sobre `silabacion`.
2. Implementar análisis de palabra y familias de rima.
3. Implementar `countPositionsToLastStress()` con política conservadora.
4. Definir únicamente el esquema `0-A-0-A`.
5. Crear pruebas del conjunto de oro.
6. Crear un diccionario editorial mínimo.

### Fase 2: generador sin LLM

1. Definir plantillas de presentación, preparación, giro y remate.
2. Generar combinaciones desde palabras finales aprobadas.
3. Validar y guardar candidatos rechazados.
4. Añadir deduplicación y comprobación de respuestas alternativas.
5. Exportar un primer banco estático.

Esta fase es importante: nos permite comprobar que el contrato y los validadores funcionan antes de atribuirle al LLM problemas que son realmente de diseño.

### Fase 3: LLM como autor asistido

1. Añadir el planificador estructurado.
2. Generar variantes de versos desde objetivos finales.
3. Ejecutar validadores deterministas automáticamente.
4. Enviar solo supervivientes al crítico blando.
5. Añadir reparación acotada por defecto técnico.
6. Guardar prompt, modelo, respuesta y diagnósticos por candidato.

### Fase 4: QA asistido y calibración

1. Comparar el juez del LLM con decisiones editoriales.
2. Ajustar ejemplos y rúbrica.
3. Añadir Rantanplan como comprobador externo.
4. Medir coste por reto aprobado.
5. Ajustar el tamaño del lote por familia de rima y nivel.

### Fase 5: evolución del contenido

1. Añadir nuevas familias de rima solo con palabras aprobadas.
2. Añadir estructuras sintácticas y ritmos internos variados.
3. Dejar `A-B-A-B` para una futura versión, después de estabilizar `0-A-0-A`.
4. Introducir asonancia o licencias métricas solo como decisiones de producto versionadas.
5. Crear un ciclo de aprendizaje a partir de errores de jugadores y decisiones editoriales.

## 9. Modelo de datos ampliado

El objeto interno debería conservar la diferencia entre intención, texto, diagnóstico y publicación:

```json
{
  "candidate_id": "cand-00042",
  "batch_id": "batch-2026-08-29-01",
  "brief": {
    "theme": "dragones despistados",
    "skill": "rima consonante",
    "tone": "absurdo y cercano",
    "level": 2
  },
  "plan": {
    "sequence": ["presentacion", "preparacion", "giro", "remate"],
    "final_concept": "confundir fuego con juego",
    "rhyme_scheme": "0-A-0-A",
    "target_words": {"v2": "juego", "v4": "fuego"}
  },
  "verses": [
    {"text": "...", "role": "presentacion"},
    {"text": "...", "role": "preparacion", "target_word": "juego"},
    {"text": "...", "role": "giro"},
    {"text": "...", "role": "remate", "target_word": "fuego"}
  ],
  "validation": {
    "metric": {"status": "VALIDO", "validator_version": "metric-0.1.0"},
    "rhyme": {"status": "VALIDO", "rhyme_type": "consonante"},
    "lexical": {"status": "VALIDO"},
    "ambiguity": {"status": "VALIDO", "alternatives": []}
  },
  "soft_quality": {
    "naturalness": 8,
    "coherence": 9,
    "humor": 7,
    "ripio": false,
    "judge_model": "...",
    "rubric_version": "quality-0.1.0"
  },
  "provenance": {
    "model": "...",
    "prompt_version": "writer-0.1.0",
    "generated_at": "..."
  },
  "status": "REVISAR"
}
```

La versión del validador y de la rúbrica es parte del dato. Si una nueva versión cambia la interpretación de una cuarteta antigua, podemos localizar y revisar los retos afectados.

## 10. Decisiones que conviene adoptar ahora

### Decisiones recomendadas

- El juego nunca llama a un LLM.
- La métrica y la rima son bloqueos, no componentes compensables del score.
- La primera métrica válida es exactamente siete posiciones hasta la última tónica.
- La política inicial acepta finales agudos y llanos, y rechaza licencias dudosas.
- La rima se calcula fonéticamente y se limita a familias aprobadas.
- El LLM genera planes y candidatos; el código certifica.
- La generación se hace desde las palabras finales y por lotes.
- Las respuestas alternativas se enumeran antes de publicar.
- Los candidatos rechazados se guardan junto con sus motivos.
- La revisión humana sigue siendo obligatoria para los retos destinados al juego.

### Experimentos que no deben convertirse aún en decisiones

- entrenar un modelo de poesía propio;
- permitir rima asonante en el primer banco;
- aceptar sinéresis o sinalefas dudosas;
- usar un LLM para sustituir el validador métrico;
- alimentar directamente el juego con un corpus literario;
- eliminar la revisión editorial porque el juez del LLM puntúe alto.

## Fuentes principales

- [PoeTryMe](https://poetryme.dei.uc.pt/)
- [Rantanplan](https://github.com/linhd-postdata/rantanplan)
- [silabacion](https://github.com/weiwei/silabacion)
- [RhymeTagger](https://github.com/versotym/rhymetagger)
- [PoeLM y su código](https://github.com/aitorormazabal/poetry_generation)
- [WASP](https://www.poetryinternational.com/en/poets-poems/poets/poet/102-29450_WASP)
- [Generador de décimas](https://diseno.uc.cl/memorias/pdf/memoria_dno_uc_2017_2_PAVEZ_RAMIREZ_S.pdf)
- [Poesía Automática de Kobra17](https://kobra17.com/poesia-automatica/)
- [DISCO](https://github.com/pruizf/disco)
- [PoeTree](https://github.com/versotym/poetree)
