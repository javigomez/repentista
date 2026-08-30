## Why

El generador necesita una frontera arquitectónica estable antes de incorporar reglas lingüísticas o proveedores externos. Sin ella, la CLI, los SDK de IA y la lógica poética quedarían acoplados y los validadores dejarían de ser deterministas y fáciles de probar.

## What Changes

- Establecer una arquitectura DDD con puertos y adaptadores para `QuatrainGenerator`.
- Separar dominio puro, casos de uso de aplicación, puertos e infraestructura.
- Fijar que la CLI sea un adaptador de entrada y el único entrypoint de infraestructura definido por `package.json`.
- Añadir una comprobación automatizada de las reglas de dependencia entre capas y un `npm test` reproducible.
- Mantener fuera de alcance `Game`, UI, aprobación editorial, exportación y formas distintas de `0-A-0-A`.

## Capabilities

### New Capabilities

- `architecture/hexagonal-generator-foundation`: límites de capas, reglas de dependencia y arnés de pruebas del generador.

### Modified Capabilities

Ninguna.

## Impact

Afectará a la organización futura de `src/domain`, `src/application`, `src/ports` y `src/infrastructure`, al entrypoint declarado en `package.json` y a la configuración de tests. No introduce todavía lógica de generación ni dependencias de proveedores.
