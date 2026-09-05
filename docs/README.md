# Documentación de Repentista

Esta carpeta convierte en especificaciones de trabajo la conversación compartida sobre el proyecto **Repentista** —un juego de rimas y métrica para aprender jugando—.

## Mapa de documentos

1. [Visión y alcance](01-vision-y-alcance.md)
2. [Requisitos y casos de uso](02-requisitos-y-casos-de-uso.md)
3. [Diccionario y palabras para rimar](03-diccionario-y-palabras-para-rimar.md)
4. [Motor generador de cuartetas](04-motor-generador-de-cuartetas.md)
5. [Validadores y control de calidad](05-validadores-y-control-de-calidad.md)
6. [Modelo de datos y guardado](06-modelo-de-datos-y-guardado.md)
7. [Puntuación y progresión](07-puntuacion-y-progresion.md)
8. [Arquitectura técnica](08-arquitectura-tecnica.md)
9. [Decisiones y cuestiones abiertas](09-decisiones-y-cuestiones-abiertas.md)
10. [Estructura del proyecto y pipeline de generación](10-estructura-del-proyecto.md)
11. [Aprendizajes para el creador de cuartetas](11-aprendizajes-para-el-creador-de-cuartetas.md)
12. [Testing y límites de arquitectura](12-testing-y-arquitectura.md)

## Principios transversales

- La IA genera candidatos; los validadores deterministas deciden qué puede publicarse.
- Nunca se confía en la intuición del modelo para afirmar que un verso mide bien.
- El sentido y la naturalidad tienen prioridad sobre salvar una rima o una métrica defectuosa.
- El juego consume cuartetas certificadas desde un banco de contenido; no interpreta poesía en tiempo real.
- El generador trabaja por lotes: valida primero, puntúa después y exporta solo contenido aprobado.
- `Game` y `QuatrainGenerator` están desacoplados mediante un contrato de contenido versionado.
- El progreso se guarda automáticamente y también representa las competencias aprendidas.

## Fuente

La fuente de esta síntesis es la conversación compartida por el usuario:

<https://chatgpt.com/share/6a92f1a1-52fc-83eb-b35e-40e47483ae06>

Estos documentos distinguen entre decisiones expresadas como requisitos, propuestas de diseño y asuntos todavía pendientes.
