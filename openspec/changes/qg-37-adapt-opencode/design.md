## Context

La documentación indexada de OpenCode ofrece servidor headless (`opencode serve`), OpenAPI y SDK TypeScript para crear sesiones y enviar prompts. El adaptador usará esa superficie programática, no automatización de terminal.

## Goals / Non-Goals

**Goals:** implementación intercambiable del puerto, aislamiento de sesión y errores uniformes.

**Non-Goals:** plugins de OpenCode, control de TUI o herramientas de edición de código.

## Decisions

- Se preferirá el SDK oficial contra un servidor configurado. Arrancar el proceso `opencode serve` podrá ser responsabilidad opcional del composition root, no del dominio.
- Cada rama usará una sesión propia o una estrategia de reset explícita. El adaptador guardará IDs como procedencia.
- Como OpenCode puede no garantizar el mismo Structured Outputs que OpenAI, el prompt pedirá JSON y el adaptador aplicará la validación local obligatoria del puerto; salida no conforme es error.
- Cliente, endpoint, agente y modelo serán configuración inyectable. Los tests usarán cliente falso y una suite opt-in con servidor headless.

## Risks / Trade-offs

- [API de SDK en evolución] → Fijar versión y comprobar el OpenAPI/SDK vigente durante implementación.
- [Contexto de agente añade comportamiento no deseado] → Agente/configuración mínimos y sesiones aisladas.
- [Servidor externo complica UX] → Diagnóstico claro y documentación de arranque; no ocultar autoarranques fallidos.
