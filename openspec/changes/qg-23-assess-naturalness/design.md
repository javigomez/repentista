## Context

La naturalidad requiere juicio contextual; se usa LLM como crítico, con ejemplos positivos y negativos versionados.

## Goals / Non-Goals

**Goals:** señal calibrable con evidencia y procedencia.

**Non-Goals:** reparar texto o certificar reglas formales.

## Decisions

- Un servicio de aplicación invocará el puerto LLM con una rúbrica exclusiva de naturalidad.
- La salida separará nota global y observaciones por verso; la aplicación validará rangos y citas existentes.
- Se probará con fake determinista y corpus editorial ancla.

## Risks / Trade-offs

- [Variabilidad entre modelos] → Versionar proveedor/modelo/prompt y comparar con conjunto editorial.
- [El juez confunde rareza con humor] → Instrucción y ejemplos específicos de naturalidad.
