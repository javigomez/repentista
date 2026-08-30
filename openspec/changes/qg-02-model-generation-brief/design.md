## Context

La CLI recibirá texto y opciones no confiables; el resto del núcleo necesita un value object ya validado y sin conocimiento de argumentos de terminal.

## Goals / Non-Goals

**Goals:** representar contexto y parámetros de lote con tipos estrictos; centralizar defaults y límites.

**Non-Goals:** planificar semántica, elegir proveedores o escribir versos.

## Decisions

- `GenerationBrief` será un value object de dominio construido mediante una operación que devuelve éxito o errores acumulados. Se evita lanzar excepciones para errores esperables de entrada.
- El esquema formal será una constante del tipo, no un string configurable. Esto hace imposible introducir ABAB por accidente.
- Cantidad de candidatos, top-K y umbral se modelarán con tipos numéricos validados; la CLI solo traducirá sus argumentos.

## Risks / Trade-offs

- [Cambiar defaults afecta reproducibilidad] → Versionar la política de defaults y conservarla en la trazabilidad.
- [Demasiadas opciones tempranas] → Limitar el brief a datos usados por el flujo inicial.
