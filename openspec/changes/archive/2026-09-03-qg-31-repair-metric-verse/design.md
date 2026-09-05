## Context

La escansión determinista permite enviar al LLM un error preciso en lugar de pedir una regeneración general.

## Goals / Non-Goals

**Goals:** cambios mínimos, invariantes preservadas y revalidación.

**Non-Goals:** modificar palabras finales, reparar varios versos o aceptar licencias.

## Decisions

- El reparador será un servicio de aplicación que usa el escritor/puerto LLM y una política de intentos inyectable.
- Cada intento creará una revisión enlazada al candidato, nunca sobrescribirá el texto original.
- La prevalidación comprobará restricciones fijas; después se ejecutará el validador métrico real.

## Risks / Trade-offs

- [Bucles costosos] → Límite por verso y descarte temprano de variantes estructuralmente inválidas.
- [Deriva semántica difícil de detectar] → Revalidar anclas y dejar defectos blandos a sus evaluadores.
