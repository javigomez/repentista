## Context

Planificadores, escritores, críticos y reparadores comparten la necesidad de pedir JSON estructurado, pero OpenAI y OpenCode tienen ciclos de vida distintos.

## Goals / Non-Goals

**Goals:** contrato proveedor-neutral, trazabilidad y doble determinista.

**Non-Goals:** elegir modelo automáticamente o certificar métrica, rima, léxico y ambigüedad.

## Decisions

- El puerto expondrá una operación genérica tipada por esquema, mientras cada caso de uso define su DTO y prompt. Se evita crear un método por proveedor o por etapa.
- El contrato llevará `operation`, `promptId`, `promptVersion`, entrada, esquema, timeout y presupuesto; la respuesta incluirá procedencia y uso normalizados.
- La validación local del resultado será obligatoria incluso si el proveedor anuncia structured outputs.
- El fake de tests resolverá por `operation` y fixtures, permitiendo simular errores y secuencias de reintento.

## Risks / Trade-offs

- [El mínimo común denominador limita funciones de proveedor] → Mantener extensiones opcionales en configuración de infraestructura, nunca en dominio.
- [Esquemas complejos fallan distinto] → Contratos pequeños por estado y tests de conformidad compartidos.
