# architecture/hexagonal-generator-foundation Specification

## Purpose
Define una base comprobable para que el generador mantenga aisladas la lógica poética, la orquestación y las integraciones externas.

## Requirements

### Requirement: Dependencias dirigidas hacia el núcleo
El sistema SHALL impedir que el dominio dependa de la aplicación, de infraestructura, de la consola, del filesystem o de SDKs externos; la aplicación SHALL depender del dominio y de puertos abstractos.

#### Scenario: Comprobación de límites
- **WHEN** se ejecuta la suite de arquitectura
- **THEN** cualquier importación que atraviese un límite en dirección prohibida hace fallar el test con el origen y destino infractores

### Requirement: Entry point delgado
El sistema SHALL exponer la CLI como adaptador de entrada y entrypoint de `package.json`, delegando el comportamiento en casos de uso de aplicación.

#### Scenario: Ejecución de la CLI
- **WHEN** la CLI recibe una solicitud válida
- **THEN** traduce la entrada al contrato de aplicación sin ejecutar reglas lingüísticas ni llamadas a proveedores directamente

### Requirement: Pruebas reproducibles
El proyecto SHALL ofrecer un comando `npm test` determinista para probar dominio, aplicación, puertos y adaptadores mediante dobles controlados.

#### Scenario: Suite sin servicios externos
- **WHEN** se ejecuta `npm test` sin credenciales ni red
- **THEN** todas las pruebas que no sean contratos explícitamente opt-in pueden completarse usando fixtures y dobles deterministas
