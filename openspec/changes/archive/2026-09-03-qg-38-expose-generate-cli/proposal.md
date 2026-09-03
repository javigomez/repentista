## Why

El usuario necesita una entrada sencilla que reciba contexto y devuelva una lista ordenada de las mejores cuartetas sin conocer el pipeline interno.

## What Changes

- Añadir el comando `generate` como adaptador de entrada de la aplicación.
- Aceptar contexto, proveedor, tamaño de lote, top-K, umbral y configuración por argumentos o fichero.
- Emitir JSON estructurado con finalistas, diagnósticos resumidos, versiones y códigos de salida fiables.
- Usar `stderr` para diagnósticos y mantener toda la lógica en `GenerateQuatrains`.

## Capabilities

### New Capabilities

- `cli/generate-quatrains`: interfaz CLI principal de contexto a lista de finalistas.

### Modified Capabilities

Ninguna.

## Impact

Depende del orquestador y de los adaptadores OpenAI/OpenCode. Será parte del entrypoint de infraestructura definido en `package.json`.
