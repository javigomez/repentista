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

### API verificada (2026-09-02)

La documentación oficial actual distingue dos superficies: `@opencode-ai/client`
para conectarse por HTTP a un servidor existente y `@opencode-ai/sdk` para
alojar OpenCode dentro del proceso. Para este adaptador se fija el cliente HTTP
`@opencode-ai/client@beta`, porque el composition root controla el servidor
headless y así se mantiene la infraestructura separada del dominio.

El servidor se inicia externamente con `opencode serve` (por defecto en
`127.0.0.1:4096`). La secuencia comprobada es:

1. `client.session.create({ location: { directory } })` crea una sesión nueva.
2. `client.session.prompt({ sessionID, text })` envía el prompt y espera la
   respuesta; en la API OpenAPI equivalente es `POST /session/:id/message`.
3. La respuesta se extrae del resultado y se valida localmente contra el DTO
   del puerto.

No se usará `/tui`, scraping de terminal ni el SDK V2 beta embebido. La API
puede cambiar antes de una versión estable, por lo que la versión beta deberá
quedar fijada en el manifiesto cuando se implemente la dependencia.

## Risks / Trade-offs

- [API de SDK en evolución] → Fijar versión y comprobar el OpenAPI/SDK vigente durante implementación.
- [Contexto de agente añade comportamiento no deseado] → Agente/configuración mínimos y sesiones aisladas.
- [Servidor externo complica UX] → Diagnóstico claro y documentación de arranque; no ocultar autoarranques fallidos.
