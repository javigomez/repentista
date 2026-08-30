## Context

El repositorio es un esqueleto TypeScript estricto y ESM. Las capacidades posteriores incorporarán reglas lingüísticas puras y adaptadores para `silabacion`, OpenAI, OpenCode, JSON y CLI, por lo que necesitan una dirección de dependencias común.

## Goals / Non-Goals

**Goals:**

- Hacer que el dominio pueda probarse sin IO ni modelos externos.
- Situar el flujo en casos de uso de aplicación.
- Hacer reemplazables los adaptadores mediante puertos definidos hacia el núcleo.
- Detectar automáticamente violaciones arquitectónicas.

**Non-Goals:**

- Diseñar el juego o una UI.
- Implementar reglas poéticas o proveedores concretos.
- Introducir contenedores de inyección de dependencias.

## Decisions

1. Se usarán cuatro zonas lógicas: `domain`, `application`, `ports` e `infrastructure`. Los puertos pertenecen al lado consumidor del contrato; los adaptadores los implementan desde infraestructura.
2. El wiring se hará en un composition root cercano a la CLI. Se prefiere construcción explícita frente a un framework de DI para mantener pequeño el CLI.
3. El dominio modelará entidades, value objects y servicios puros; los validadores duros no conocerán prompts ni proveedores.
4. Los tests de arquitectura complementarán, no sustituirán, los tests de comportamiento. Cada propuesta posterior deberá comenzar con tests Red → Green → Refactor.

## Risks / Trade-offs

- [Más contratos y archivos al inicio] → Mantener puertos pequeños, orientados a casos de uso y sin abstracciones especulativas.
- [Los tests de imports pueden ser frágiles] → Comprobar reglas por prefijos estables y añadir excepciones explícitas solo en el composition root.
- [Un puerto puede filtrar tipos de un SDK] → Exigir que todos los contratos públicos usen tipos propios del proyecto.

## Migration Plan

1. Configurar el runner y `npm test`.
2. Crear las zonas y una prueba de reglas de dependencia inicialmente roja.
3. Mover el entrypoint actual a infraestructura CLI y dejar el composition root sin lógica de negocio.
4. Ejecutar `npm test` y `npm run build` como puerta de aceptación.
