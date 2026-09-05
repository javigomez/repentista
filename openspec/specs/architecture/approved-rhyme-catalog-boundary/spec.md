# architecture/approved-rhyme-catalog-boundary Specification

## Purpose
Protege mediante comprobaciones ejecutables la propiedad única de las reglas consonantes y evita que capas consumidoras creen catálogos o claves de familia paralelos.

## Requirements

### Requirement: Propietario único de familias consonantes
El catálogo consonante aprobado SHALL ser el único módulo autorizado para extraer claves consonantes, construir familias y decidir su pertenencia.

#### Scenario: Consumidor legítimo
- **WHEN** un caso de uso, validador o adapter necesita conocer una familia consonante
- **THEN** depende de la API pública del catálogo y no contiene un algoritmo equivalente

#### Scenario: Cálculo duplicado
- **WHEN** una capa consumidora introduce lógica para derivar una familia desde vocales, tonicidad, sílabas o sufijos
- **THEN** la suite de arquitectura falla e identifica el fichero y la frontera infringida

### Requirement: Verificación resistente a renombres
La frontera SHALL combinar reglas de dependencia con fixtures conductuales adversariales para no depender únicamente de nombres concretos de funciones.

#### Scenario: Helper renombrado
- **WHEN** una reimplementación local evita palabras clave conocidas pero decide candidatas sin consultar el catálogo
- **THEN** al menos una comprobación de arquitectura o aceptación falla

### Requirement: Excepciones explícitas y temporales
Una excepción a la frontera MUST estar documentada con alcance, motivo y condición de retirada, y MUST NOT aprobarse mediante una exclusión genérica de directorios.

#### Scenario: Exclusión sin registro
- **WHEN** se intenta omitir un módulo consumidor de las comprobaciones sin una excepción específica documentada
- **THEN** la suite falla con un diagnóstico de configuración
