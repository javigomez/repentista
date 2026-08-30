# Decisiones y cuestiones abiertas

## Decisiones extraídas de la conversación

- Habrá dos softwares: generador y juego.
- El repositorio separará `Game` y `QuatrainGenerator` como productos independientes.
- `Game` consumirá un paquete estático de cuartetas y no contendrá el generador ni sus validadores.
- `QuatrainGenerator` tendrá una skill de orquestación y scripts ejecutables para validar, puntuar y exportar.
- La generación será guiada por una plantilla y empezará por el remate.
- La generación trabajará por lotes: los bloqueos se validan antes de puntuar y el score se usa para filtrar y ordenar.
- La métrica será determinista y obligatoria.
- Se usará una política conservadora de sinalefas.
- La rima se calculará fonéticamente, no por letras finales.
- El juego consumirá un banco de contenido certificado.
- Se guardará automáticamente después de cada respuesta.
- El guardado incluirá habilidades, palabras dominadas y problemáticas.
- Los primeros niveles usarán botones grandes, emoji y texto.
- La puntuación del jugador será objetiva; el ingenio subjetivo del contenido pertenece al puntuador editorial y no al runtime del juego.
- Se comprobarán respuestas alternativas antes de publicar.
- Se rechazarán los ripios aunque rimen.
- Los candidatos rechazados se conservarán con sus motivos para poder auditar y mejorar el pipeline.

## Propuestas que requieren confirmación

- Umbral exacto de publicación: se ha propuesto `80/100`.
- Cantidad por defecto del lote y cantidad de resultados devueltos (`N` y `top-K`).
- Si el score subjetivo será completamente asistido por IA o requerirá una revisión editorial obligatoria.
- Fórmula precisa de aplicación de multiplicadores.
- En la primera versión se usará únicamente `-A-A` (`0-A-0-A`). `ABAB` queda fuera de alcance hasta validar el flujo básico.
- Qué grado de asonancia se admitirá en niveles futuros.
- Qué motor o biblioteca se usará para división silábica y fonética.
- Si el autosave será local, remoto o híbrido.
- Si habrá cuenta de usuario o solo perfil local.
- Cómo se implementará la lectura fonética/cantabilidad sin convertirla en un árbitro opaco.
- Qué significa exactamente “generar 20 candidatos” en coste, latencia y UX del generador.
- Qué personaje, historia y orden narrativo tendrán los primeros niveles.

## Trabajo editorial pendiente

- Completar familias de rima, especialmente `-ente`.
- Revisar la categoría de palabras polisémicas o nominalizadas.
- Definir nivel de vocabulario y frecuencia de uso.
- Asignar emojis y claridad visual de forma consistente.
- Crear un corpus de versos positivos y negativos para tests.
- Decidir cuándo un distractor rima pero rompe el significado y cuándo es semántico pero no rima.
- Definir el feedback visible para niños sin revelar toda la teoría demasiado pronto.
- Crear el contrato de exportación y decidir si `Game` recibe el banco completo en la aplicación o mediante paquetes de contenido actualizables.

## Riesgos principales

1. **El validador métrico puede ser demasiado permisivo.** Mitigación: estado `DUDOSO`, confianza y política conservadora.
2. **La rima puede ser formal pero forzada.** Mitigación: detector de ripio y revisión editorial.
3. **Puede haber varias respuestas válidas.** Mitigación: enumeración previa y reescritura por defecto.
4. **El banco puede volverse repetitivo.** Mitigación: similitud histórica y variedad de estructuras/personajes.
5. **La velocidad puede frustrar el aprendizaje.** Mitigación: bonus sin penalización por tardar y adaptación por competencia.
6. **La IA puede generar objetos incompletos o inconsistentes.** Mitigación: esquema estricto, validación de contrato y rechazo antes de publicación.

## Criterio para aceptar nuevas decisiones

Toda decisión nueva debería documentar:

- qué problema resuelve;
- qué módulo afecta;
- si es requisito, propuesta o experimento;
- cómo se probará;
- qué versión del banco o validador necesita.
