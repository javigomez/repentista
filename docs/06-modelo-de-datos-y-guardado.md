# Modelo de datos y guardado

## Principios

- Autosave después de cada respuesta.
- El usuario nunca necesita pulsar “Guardar”.
- Se guarda tanto la posición en el juego como la competencia aprendida.
- Las cuartetas publicadas conservan su trazabilidad de validación.

## Estado de usuario

```yaml
usuario: "id-local-o-cuenta"
nivel_actual: 3
reto_actual: "reto-0007"
puntuacion_total: 0
racha_actual: 0
mejor_racha: 0
retos_resueltos: 0
retos_fallados: 0
habilidades:
  consonante: {nivel: 0, aciertos: 0, fallos: 0}
  asonante: {nivel: 0, aciertos: 0, fallos: 0}
  octonol: {nivel: 0, aciertos: 0, fallos: 0}
  preparacion: {nivel: 0, aciertos: 0, fallos: 0}
  remate: {nivel: 0, aciertos: 0, fallos: 0}
  metafora: {nivel: 0, aciertos: 0, fallos: 0}
palabras_vistas: []
palabras_dominadas: []
palabras_problematicas: []
familias_rima_problematicas: []
fecha_ultima_partida: "2026-08-29T00:00:00Z"
```

## Estado de un reto publicado

```yaml
id: "reto-0007"
cuarteta_completa:
  v1: "..."
  v2: "..."
  v3: "..."
  v4: "..."
palabra_oculta: "juego"
posicion_oculta: 2
respuesta_principal: "juego"
respuestas_alternativas_validas: []
distractores: []
esquema_rima: "-A-A"
familias_rima: ["uego"]
escansion:
  v1: {}
  v2: {}
  v3: {}
  v4: {}
habilidad_entrenada: "rima_consonante"
nivel: 2
personaje: "Capitán Remate"
escena: "..."
chiste_o_remate: "..."
estado_qa: "APROBADO"
version_validador: "metric-0.1.0"
```

Este modelo pertenece al contrato que consume `Game`. El generador puede conservar más información —prompt, candidatos, razones de rechazo, desglose del score y decisión editorial—, pero esa información no es necesaria en el runtime móvil.

## Modelo de lote del generador

```yaml
batch_id: "lote-2026-08-29-001"
brief: {}
requested_count: 100
minimum_score: 80
requested_results: 5
generated_count: 100
validated_count: 50
scored_count: 50
selected_count: 5
status: "LISTO_PARA_QA"
candidates: []
versions:
  validator: "0.1.0"
  rubric: "0.1.0"
  prompt: "0.1.0"
```

Cada elemento de `candidates` debe enlazar sus resultados de validación, score y estado. El resumen del lote permite saber si el problema fue la generación, una regla demasiado estricta o un umbral demasiado alto.

## Transacción de respuesta

La respuesta del jugador debe producir un evento auditable, por ejemplo:

```yaml
reto_id: "reto-0007"
respuesta: "juego"
correcta: true
tiempo_ms: 3200
timestamp: "2026-08-29T00:00:00Z"
puntos_base: 100
bonus_rapidez: 75
multiplicador_racha: 1.0
puntos_totales: 175
```

El guardado debe ser idempotente o incluir una secuencia/event ID para no duplicar puntos si se reintenta una operación.

## Reanudación inteligente

La selección del siguiente reto debe considerar competencia, no solo `nivel_actual` y número de pregunta:

- Reintroducir familias con varios fallos.
- Reducir familias dominadas.
- Mantener variedad temática y evitar repetición.
- No bombardear al jugador con `-ón` si ya la domina.

## Versionado y revalidación

`version_validador` permite revalidar todo el banco cuando mejore la separación silábica, las reglas de sinalefa o la rima fonética. El resultado puede pasar a `REVALIDAR`, `APROBADO` o `RECHAZADO` sin perder el histórico.
