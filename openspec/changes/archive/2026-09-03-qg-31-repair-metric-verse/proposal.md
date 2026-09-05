## Why

Cuando un verso falla solo por métrica, regenerar la cuarteta completa desperdicia decisiones válidas y aumenta la deriva. La reparación debe limitarse al verso y al diagnóstico exacto.

## What Changes

- Añadir un reparador específico para defectos métricos.
- Conservar rol, sentido, palabra final y propiedades ya válidas.
- Solicitar variantes corregidas al LLM y revalidar cada una con el validador duro.
- Limitar intentos y devolver fallo sin relajar la política métrica.

## Capabilities

### New Capabilities

- `repair/metric-verse`: reparación acotada de versos que no alcanzan exactamente siete posiciones.

### Modified Capabilities

Ninguna.

## Impact

Depende del escritor de un verso, el puerto LLM y el validador de octoñol. No repara rima cambiando palabras finales.
