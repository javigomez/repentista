# Visión y alcance

## Idea del producto

Repentista es un juego mobile-first de cuartetas humorísticas en castellano. El jugador completa o identifica palabras dentro de una cuarteta mediante botones grandes, emojis y texto progresivamente reducido. Mientras juega, interioriza el pulso del octosílabo —llamado internamente **octoñol**— sin recibir una explicación académica al principio.

El proyecto se divide físicamente en dos productos relacionados, con responsabilidades y ciclos de ejecución distintos:

1. **`QuatrainGenerator`**: herramienta de autoría que planifica, genera lotes, valida, puntúa y publica contenido certificado.
2. **`Game`**: cliente móvil que consume exclusivamente cuartetas estáticas ya validadas; no genera contenido en tiempo de juego.

La frontera entre ambos es un paquete de contenido versionado. El generador puede usar modelos y scripts de QA durante la autoría, pero el juego solo necesita el resultado exportado.

## Qué significa octoñol

La regla operativa es contar **siete posiciones métricas hasta la última sílaba tónica** del verso. En un final llano esto suele producir ocho sílabas métricas; en un final agudo, siete sílabas gramaticales más el ajuste métrico del final.

La formulación que debe guiar al sistema es:

> ¿Hay exactamente siete posiciones métricas hasta la última tónica?

No basta con contar ocho sílabas de forma ingenua.

## Experiencia buscada

- Partidas breves: desde una sola cuarteta hasta muchas.
- Reanudación inmediata tras abandonar.
- Flujo vertical continuo: la cuarteta resuelta sube y la siguiente entra desde abajo.
- Interacción con una mano y sin teclado en los primeros niveles.
- Humor, absurdo e imaginación mediante personajes lingüísticos.
- Historia e instrucciones comunicadas preferentemente con cuartetas.

## Tono y mundo

El mundo puede personificar conceptos lingüísticos y poéticos, por ejemplo:

- Don Gerundio.
- Señor Ripio.
- Capitán Remate.
- Pulpo Octoñol, que revela más adelante el pulso que el jugador ya ha aprendido.

El tono debe ser absurdo, cercano, juguetón y nunca condescendiente con un niño de aproximadamente 10–12 años.

## Fuera del alcance inicial

- No se exige valorar subjetivamente la calidad poética de respuestas libres.
- No se aceptan licencias métricas difíciles de justificar.
- No se genera una cuarteta directamente delante del jugador ni se incluye el generador dentro del juego.
- No se obliga a usar teclado en los primeros niveles.
- No se incluyen esdrújulas en la primera versión del diccionario.
