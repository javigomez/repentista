## Context

El ripio es subjetivo pero tiene señales editoriales repetibles; conviene combinar reglas locales y crítico LLM.

## Goals / Non-Goals

**Goals:** diagnóstico específico y reparable.

**Non-Goals:** validar consonancia o decidir por sí solo el descarte final.

## Decisions

- Se ejecutarán primero patrones deterministas; después el LLM recibirá texto, plan y evidencias sin ver score de otras dimensiones.
- El resultado conservará ambas fuentes y una severidad normalizada.
- Los ejemplos negativos serán fixtures editoriales, no frases de corpus copiadas indiscriminadamente.

## Risks / Trade-offs

- [Humor absurdo parece causalidad forzada] → Ejemplos que separen absurdo intencional de relleno.
- [Reglas léxicas generan falsos positivos] → Usarlas como evidencia, con severidad y contexto.
