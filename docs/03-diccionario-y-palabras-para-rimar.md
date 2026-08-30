# Diccionario y palabras para rimar

## Propósito

El diccionario es un recurso editorial y técnico. No debe ser una lista plana: también describe tonicidad, fonética, categoría, emoji, utilidad narrativa y relaciones de rima precalculadas.

La lista de abajo es una **semilla extraída de la conversación**, no un banco listo para producción. Antes de usarla en retos hay que verificar pronunciación, tonicidad, categoría, nivel de vocabulario y naturalidad.

## Esquema recomendado de entrada

```yaml
palabra: "dragón"
lema: "dragón"
terminacion_ortografica: "-ón"
terminacion_fonetica: "on"
tonicidad: "aguda"
categoria: "sustantivo"
emoji: "🐉"
claridad_emoji: 3
nivel_vocabulario: "basico"
permitida_objetivo: true
permitida_rima: true
calidad_jugable: 5
calidad_para_remate: 4
buena_como_preparacion: true
buena_como_remate: true
rimas_aprobadas: ["balcón", "ratón", "cajón", "botón", "limón"]
estado: "PENDIENTE_VALIDACION"
```

Campos mínimos:

- `palabra`, `lema` y forma visible.
- Terminación fonética desde la última vocal tónica.
- Tonicidad: `aguda` o `llana` inicialmente.
- Categoría gramatical.
- Emoji y `claridad_emoji` de 0 a 3.
- Nivel de vocabulario.
- Permisos de uso como objetivo o como rima.
- Calidad para juego, preparación y remate.
- Lista de rimas aprobadas o referencia a una familia.
- Estado de validación y versión del diccionario.

## Semillas de familias consonantes

### Familia `-ón` / terminación fonética `on`

| Palabra | Categoría sugerida | Tonicidad | Emoji posible | Rol inicial |
|---|---|---|---|---|
| dragón | sustantivo | aguda | 🐉 | remate / objetivo |
| balcón | sustantivo | aguda | 🏠 | preparación |
| ratón | sustantivo | aguda | 🐭 | preparación |
| cajón | sustantivo | aguda | 🗄️ | preparación |
| botón | sustantivo | aguda | 🔘 | remate / objetivo |
| limón | sustantivo | aguda | 🍋 | preparación |
| sillón | sustantivo | aguda | 🛋️ | preparación |

### Familia `-uego` / terminación fonética `uego`

| Palabra | Categoría sugerida | Tonicidad | Emoji posible | Rol inicial |
|---|---|---|---|---|
| fuego | sustantivo | llana | 🔥 | remate / objetivo |
| juego | sustantivo | llana | 🎲 | preparación / objetivo |
| luego | adverbio | llana | ⏭️ | preparación |
| ruego | sustantivo/verbo nominalizado | llana | 🙏 | preparación |

### Familia `-ado` / terminación fonética `ado`

| Palabra | Categoría sugerida | Tonicidad | Emoji posible | Rol inicial |
|---|---|---|---|---|
| tejado | sustantivo | llana | 🏠 | remate / escena |
| mojado | adjetivo | llana | 💧 | preparación |
| sentado | participio/adjetivo | llana | 🪑 | preparación |
| cuadrado | adjetivo | llana | ◼️ | preparación |

## Relaciones que deben tratarse con cuidado

- `rima` y `encina` se usan como ejemplo de rima **asonante** (`i-a`), no de rima consonante. No deben mezclarse en el mismo esquema consonante.
- `fuego` y `apego` aparecen como ejemplo de razonamiento inicial del usuario, pero `apego` no debe aprobarse automáticamente como consonante de `fuego`. La familia debe calcularse fonéticamente.
- `-ente` aparece como familia útil para la reanudación adaptativa, pero aún no hay una lista aprobada en la conversación. Debe completarse editorialmente.

## Reglas editoriales

- Preferir palabras cotidianas y visualmente inequívocas.
- Favorecer sustantivos y cruces entre categorías gramaticales.
- Evitar parejas infinitivo/infinitivo y participio/participio por repetición morfológica.
- Separar “buena para preparar” de “buena para rematar”.
- Precalcular las relaciones de rima; el juego no debe descubrirlas en tiempo real.
- Marcar las palabras con emoji ambiguo para que no aparezcan en el modo solo-emojis.
- No añadir una palabra al banco jugable sin pasar el validador y revisión editorial.
