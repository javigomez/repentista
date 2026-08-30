## Context

Los evaluadores producen evidencias estructuradas que permiten prompts de reparación específicos.

## Goals / Non-Goals

**Goals:** edición mínima, auditabilidad y puertas posteriores.

**Non-Goals:** optimización simultánea de todas las notas o reparación ilimitada.

## Decisions

- Un DTO común de reparación contendrá dimensión, diagnóstico, slots editables e invariantes; cada dimensión tendrá una plantilla de prompt versionada.
- El resultado se materializará como una rama hija para comparar antes/después.
- Primero se ejecutan validadores duros; solo las supervivientes vuelven al evaluador afectado.

## Risks / Trade-offs

- [Mejorar una dimensión empeora otra] → El scoring posterior compara el conjunto completo y el orquestador puede conservar original.
- [Coste de reevaluación] → Reevaluar primero la dimensión objetivo y después el conjunto necesario solo en variantes prometedoras.
