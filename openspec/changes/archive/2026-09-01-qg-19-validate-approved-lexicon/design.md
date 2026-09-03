## Context

La política inicial controla explícitamente palabras finales y anclas señaladas; no pretende validar cada forma funcional del castellano.

## Goals / Non-Goals

**Goals:** bloqueo cerrado y reproducible por snapshot.

**Non-Goals:** análisis gramatical completo o adecuación por edad.

## Decisions

- El validador consultará el puerto del diccionario por clave normalizada y comparará permisos de rol.
- El candidato conservará qué tokens son controlados para evitar exigir que artículos y preposiciones estén en el banco rimante.
- Falla de infraestructura del repositorio será un resultado no confiable, no `INVALIDO` lingüístico.

## Risks / Trade-offs

- [Cobertura demasiado estrecha] → Separar banco de palabras controladas de vocabulario funcional permitido.
- [Versión no disponible] → Detener validación con error operativo explícito.
