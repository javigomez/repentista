# Puntuación y progresión

## Puntuación inicial

La puntuación debe premiar acierto y velocidad, pero sin castigar el aprendizaje pausado.

- Acierto: `100` puntos.
- Bonus de rapidez: hasta `+100`.
- Nunca hay puntuación negativa por tardar.

| Tiempo | Bonus |
|---|---:|
| `< 2 s` | +100 |
| `2–4 s` | +75 |
| `4–7 s` | +50 |
| `7–12 s` | +25 |
| `>12 s` | 0 |

## Rachas

| Aciertos consecutivos | Multiplicador |
|---:|---:|
| 3 | ×1,2 |
| 5 | ×1,5 |
| 10 | ×2 |

Un error rompe el multiplicador, pero no borra los puntos ya acumulados.

Fórmula inicial sugerida:

```text
puntos = (100 + bonus_rapidez) × multiplicador_racha
```

Debe definirse explícitamente si el primer acierto de una racha usa el multiplicador anterior o el nuevo.

## Puntuaciones separadas futuras

En fases posteriores se puede mostrar una evaluación separada:

- **RIMA:** corrección formal.
- **INGENIO:** calidad de la solución.

No se recomienda que una IA juzgue subjetivamente “qué poema es mejor” en los primeros niveles.

## Progresión de niveles

| Nivel | Mecánica | Habilidad principal |
|---:|---|---|
| 1 | Falta el verso 4; emoji + texto. | Encontrar la palabra |
| 2 | Falta la palabra final del verso 2; V4 está dado. | Preparar la rima |
| 3 | Se reduce progresivamente el texto bajo los emojis. | Reconocimiento visual |
| 4 | Intruso con distractores asonantes, consonantes y semánticos. | Distinguir tipos de relación |
| 5 | Pendiente de una futura versión: dos rimas en esquema `ABAB`. | Seguir dos familias |
| 6 | Se hace explícito el pulso correcto. | Octoñol consciente |
| 7 | Se proporciona el remate. | Pie forzado |
| 8 | Construir un verso. | Producción guiada |
| 9 | Construir dos versos. | Producción parcial |
| 10 | Cuarteta improvisada. | Producción completa |

La progresión va de reconocimiento a producción real sin exigir teoría métrica desde el inicio.

## Adaptación

La dificultad debe ajustar frecuencia de familias, nivel de vocabulario, claridad de emojis, número de distractores, esquema de rima y cantidad de texto visible. Las habilidades y palabras problemáticas del guardado deben alimentar esta decisión.
