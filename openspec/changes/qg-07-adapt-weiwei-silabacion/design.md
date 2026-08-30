## Context

Context7 no indexa esta biblioteca; al implementar habrá que verificar README, paquete y versión publicados. La documentación del proyecto la selecciona por TypeScript y licencia MIT.

## Goals / Non-Goals

**Goals:** encapsular API, fijar versión y detectar divergencias lingüísticas.

**Non-Goals:** contar métrica de versos, decidir sinalefas o aceptar toda licencia poética.

## Decisions

- Se definirá un `WordAnalysisPort` propio consumido por el núcleo. Solo el adaptador importará `silabacion`.
- La traducción comprobará invariantes internas: sílabas no vacías, índice en rango y tonicidad compatible.
- La dependencia se fijará a una versión exacta y se documentarán licencia y API verificadas en la tarea de integración.
- Los fixtures incluirán casos del diccionario y contraejemplos de diptongo/hiato.

## Risks / Trade-offs

- [La biblioteca no cubre una palabra] → Devolver no confiable y bloquearla editorialmente.
- [La API real difiere de lo supuesto] → El diseño depende solo del puerto; ajustar únicamente el adaptador tras verificar documentación.
