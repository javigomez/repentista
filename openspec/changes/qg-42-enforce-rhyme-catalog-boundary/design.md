## Context

El proyecto ya dispone de tests de límites arquitectónicos y utilidades en `src/testing/architecture-rules.ts`. El defecto de QG-40 muestra que las reglas actuales no protegen la propiedad de algoritmos lingüísticos: una implementación puede duplicar el cálculo de familias y aun satisfacer sus propios tests funcionales.

## Goals / Non-Goals

**Goals:**

- Convertir la fuente única de verdad de rima consonante en una regla ejecutable.
- Producir diagnósticos concretos y mantener la comprobación barata y offline.
- Detectar tanto dependencias inválidas como evasiones conductuales relevantes.

**Non-Goals:**

- Crear un analizador semántico TypeScript general.
- Prohibir funciones de texto o vocales que no tengan relación con rimas.
- Sustituir code review por búsquedas estáticas.

## Decisions

1. Se ampliará el arnés existente de arquitectura, en vez de introducir una dependencia nueva. La regla de imports exigirá que los consumidores de familias dependan del módulo concreto del catálogo y evitará dependencias inversas.
2. La detección no descansará solo en expresiones regulares de nombres. Se combinarán: inventario explícito de módulos autorizados, inspección de imports y pruebas adversariales de capacidades consumidoras con un catálogo doble.
3. Los falsos positivos se resolverán estrechando la regla o registrando una excepción individual con motivo y fecha/condición de retirada. Se descartan exclusiones por carpeta porque pueden ocultar deuda futura.
4. QG-41 será la corrección previa recomendada. Durante Red, el nuevo test debe demostrar que la implementación actual de inspección infringe la frontera; Green llegará eliminando la duplicación, no debilitando el test.

## Risks / Trade-offs

- [La comprobación textual puede producir falsos positivos] → Usarla como una señal acotada y respaldarla con reglas de imports y tests conductuales.
- [Una reimplementación sofisticada puede evadir el análisis estático] → Mantener fixtures adversariales en los consumidores críticos y revisión independiente del diff.
- [Acoplamiento a la estructura de carpetas] → Centralizar rutas y propietarios en la utilidad de arquitectura con mensajes de migración claros.

## Migration Plan

1. Integrar QG-41 o aplicar conjuntamente su eliminación del cálculo duplicado.
2. Escribir el test de regresión contra el estado defectuoso y conservar evidencia de que falla.
3. Añadir reglas, fixtures adversariales y documentación de excepciones.
4. Ejecutar la familia de arquitectura, `npm test` y `npm run build`.

