# Test conventions

Los tests del generador deben preferir fixtures versionados, dobles deterministas y dependencias inyectadas. No deben requerir red, credenciales, reloj real, aleatoriedad no controlada ni filesystem global.

`test-doubles.ts` contiene utilidades mínimas para reloj fijo y secuencias controladas. Cada feature debe añadir sus propios fixtures legibles junto al test que los usa.
